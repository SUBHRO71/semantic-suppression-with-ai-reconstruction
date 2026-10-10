import os
os.environ.setdefault("OMP_NUM_THREADS", "1")
import asyncio
from collections import deque
from contextlib import asynccontextmanager
import csv
import io
import json
import multiprocessing
from pathlib import Path
import sqlite3
import time
from typing import Literal
import numpy as np
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from backend.domain import Config, EventDetector, SPANS, WARMUP, encode
from backend.model import Predictor, ReceiverState
from backend.sender import sender_main

ROOT = Path(__file__).resolve().parents[1]


class Settings(BaseModel):
    model_config = ConfigDict(extra="forbid")
    load: float | None = Field(None, ge=0, le=1)
    heating: bool | None = None
    heating_rate: float | None = Field(None, ge=0, le=1.5)
    randomness: float | None = Field(None, ge=0, le=1)
    cycling: bool | None = None
    overheat: bool | None = None
    vibration_fault: bool | None = None
    suppression: bool | None = None
    aggressiveness: float | None = Field(None, ge=0, le=1)
    heartbeat: int | None = Field(None, ge=2, le=30)
    speed: Literal[1, 2, 5] | None = None


class Command(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: Literal["configure", "start", "resume", "pause", "reset"] = "configure"
    settings: Settings = Field(default_factory=Settings)
    preset: Literal["steady", "heat", "variable"] | None = None


class Measurement(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    kind: Literal["measurement"]
    run: str
    tick: int = Field(ge=1)
    values: list[float] = Field(min_length=3, max_length=3)
    sent_at: float
    events: list[str] = Field(default_factory=list)


class Lab:
    def __init__(self, predictor, database):
        self.predictor = predictor
        self.db = sqlite3.connect(database)
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("CREATE TABLE IF NOT EXISTS samples (run TEXT,tick INTEGER,record TEXT,PRIMARY KEY(run,tick))")
        self.db.execute("CREATE TABLE IF NOT EXISTS runs (run TEXT PRIMARY KEY,summary TEXT)")
        self.clients = set()
        self.channel_connected = False
        self.observer_connected = False
        self.reset("")

    def reset(self, run):
        if getattr(self, "run", ""):
            self.persist_summary()
        self.run = run
        self.state = "ready"
        self.config = Config().dict()
        self.series = deque(maxlen=180)
        self.logs = deque(maxlen=30)
        self.segments = deque(maxlen=50)
        self.observations, self.outputs = {}, {}
        self.ticks, self.sent, self.baseline_bytes = 0, 0, 0
        self.measurement_bytes, self.control_bytes = 0, 0
        self.errors = np.zeros(3)
        self.expected_events = self.delivered_events = 0
        self.delays = deque(maxlen=100)
        self.event_detector = EventDetector()
        self.hot = self.vibration = False
        self.failure = None

    def persist_summary(self):
        self.db.execute("INSERT OR REPLACE INTO runs VALUES (?,?)", (self.run, encode(self.snapshot())))
        self.db.commit()

    def add_observation(self, value):
        if value["run"] != self.run:
            return
        self.observations[value["tick"]] = value
        self.join(value["tick"])

    def add_output(self, value):
        if value["run"] != self.run:
            return
        self.outputs[value["tick"]] = value
        self.join(value["tick"])

    def join(self, tick):
        if tick not in self.observations or tick not in self.outputs:
            return
        obs, output = self.observations.pop(tick), self.outputs.pop(tick)
        error = np.abs(np.array(obs["truth"]) - output["values"])
        expected = self.event_detector.detect(obs["truth"])
        delivered = [event for event in output["events"] if event in expected]
        self.expected_events += len(expected)
        self.delivered_events += len(delivered)
        if delivered:
            self.delays.append(max(0, (output["received_at"] - obs["detected_at"]) * 1000))
        self.hot = self.event_detector.hot
        self.vibration = self.event_detector.vibration
        self.ticks += 1
        self.sent += int(output["exact"])
        self.baseline_bytes += obs["baseline_bytes"]
        self.errors += error
        record = {"tick": tick, "truth": obs["truth"], "received": output["values"],
                  "forecast": output["forecast"], "exact": output["exact"], "age": output["age"],
                  "error": np.round(error, 4).tolist(), "reason": obs["decision"]["reason"],
                  "detail": obs["decision"]["detail"], "events": expected, "config": obs["config"],
                  "baseline_bytes": obs["baseline_bytes"], "payload_bytes": output["payload_bytes"],
                  "delay_ms": self.delays[-1] if delivered else None}
        self.series.append(record)
        self.logs.appendleft({"tick": tick, "sent": output["exact"], "reason": record["reason"],
                              "detail": record["detail"], "events": expected})
        self.db.execute("INSERT OR REPLACE INTO samples VALUES (?,?,?)", (self.run, tick, encode(record)))
        if tick % 10 == 0:
            self.persist_summary()
        if self.state in ("running", "warming_up"):
            self.state = "warming_up" if tick < WARMUP else "running"

    def snapshot(self):
        mae = self.errors / max(self.ticks, 1)
        actual = self.measurement_bytes + self.control_bytes
        recent = list(self.series)[-30:]
        recent_sent = sum(int(row["exact"]) for row in recent)
        return {"run": self.run, "state": self.state, "config": self.config, "series": list(self.series),
                "logs": list(self.logs), "segments": list(self.segments), "failure": self.failure,
                "channel_connected": self.channel_connected, "sender_connected": self.observer_connected,
                "faults": {"hot": self.hot, "vibration": self.vibration},
                "model": {"version": self.predictor.version, "digest": self.predictor.digest,
                          "bootstrap_bytes": self.predictor.bootstrap_bytes, "envelope": self.predictor.envelope},
                "metrics": {"ticks": self.ticks, "sent": self.sent, "suppressed": self.ticks - self.sent,
                    "frame_savings": 1 - self.sent / self.ticks if self.ticks else None,
                    "byte_savings": 1 - actual / self.baseline_bytes if self.baseline_bytes else None,
                    "baseline_bytes": self.baseline_bytes, "actual_bytes": actual,
                    "measurement_bytes": self.measurement_bytes, "control_bytes": self.control_bytes,
                    "mae": mae.tolist(), "normalized_mae": float(np.mean(mae / SPANS)),
                    "events_expected": self.expected_events, "events_delivered": self.delivered_events,
                    "event_delay_ms": float(np.mean(self.delays)) if self.delays else None,
                    "recent_frame_savings": 1 - recent_sent / len(recent) if recent else None,
                    "recent_mae": np.mean([r["error"] for r in recent], axis=0).tolist() if recent else [0, 0, 0]}}


class ReceiverClock:
    """The receiver advances on its own clock, never on observation/suppression messages."""
    def __init__(self, lab):
        self.lab = lab
        self.receiver = ReceiverState(lab.predictor)
        self.frames = {}
        self.task = None
        self.run = ""

    async def halt(self, last_tick=None):
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
            self.task = None
        if last_tick is not None:
            while self.receiver.tick < last_tick:
                self.advance()

    def advance(self):
        tick = self.receiver.tick + 1
        frame = self.frames.pop(tick, None)
        result = self.receiver.step(tick, frame["values"] if frame else None)
        result.update({"run": self.run, "events": frame.get("events", []) if frame else [],
                       "received_at": frame["received_at"] if frame else None,
                       "payload_bytes": frame["payload_bytes"] if frame else 0})
        self.lab.add_output(result)

    def start(self, next_at, period):
        async def loop():
            deadline = next_at
            try:
                while True:
                    # A bounded playout buffer absorbs local process scheduling jitter.
                    await asyncio.sleep(max(0, deadline + min(0.18, period * 0.8) - time.monotonic()))
                    self.advance()
                    deadline += period
            except asyncio.CancelledError:
                raise
            except Exception as error:
                self.lab.state = "failed"
                self.lab.failure = str(error)
        self.task = asyncio.create_task(loop())


@asynccontextmanager
async def lifespan(app):
    if not __import__("backend.model", fromlist=["MODEL_PATH"]).MODEL_PATH.exists():
        raise RuntimeError("Local model missing. Run python scripts/train.py first.")
    (ROOT / "data").mkdir(exist_ok=True)
    predictor = Predictor()
    app.state.lab = Lab(predictor, ROOT / "data" / "runs.sqlite3")
    app.state.clock = ReceiverClock(app.state.lab)
    context = multiprocessing.get_context("spawn")
    app.state.commands = context.Queue()
    process = context.Process(target=sender_main, args=(app.state.commands, int(os.getenv("SIGNAL_LOOM_PORT", "8000"))), daemon=True)

    async def boot_sender():
        await asyncio.sleep(0.5)
        process.start()
    boot_task = asyncio.create_task(boot_sender())

    async def broadcast():
        while True:
            await asyncio.sleep(0.2)
            if process.pid and not process.is_alive() and app.state.lab.state != "failed":
                app.state.lab.state = "failed"
                app.state.lab.failure = "Sender stopped. Restart the local application."
            message = encode(app.state.lab.snapshot())
            for client in tuple(app.state.lab.clients):
                try:
                    await asyncio.wait_for(client.send_text(message), timeout=0.5)
                except Exception:
                    app.state.lab.clients.discard(client)
    broadcast_task = asyncio.create_task(broadcast())
    yield
    boot_task.cancel()
    broadcast_task.cancel()
    await app.state.clock.halt()
    app.state.commands.put({"action": "shutdown"})
    if process.pid:
        await asyncio.to_thread(process.join, 3)
        if process.is_alive():
            process.terminate()
    app.state.lab.persist_summary()
    app.state.lab.db.close()


app = FastAPI(title="Signal Loom", lifespan=lifespan)


@app.get("/api/health")
def health():
    return {"status": "ok", "model": app.state.lab.predictor.version,
            "sender": app.state.lab.observer_connected}


@app.get("/api/state")
def state():
    return app.state.lab.snapshot()


@app.post("/api/control")
def control(command: Command):
    if not app.state.lab.observer_connected:
        raise HTTPException(503, "Sender is not connected. Restart the application if this persists.")
    payload = {"action": command.action, "settings": command.settings.model_dump(exclude_none=True)}
    if command.preset:
        payload["preset"] = command.preset
    app.state.commands.put(payload)
    return {"queued": True, "effective_by": "next simulator tick"}


@app.get("/api/report")
def report():
    return json.loads((ROOT / "evaluation" / "report.json").read_text(encoding="utf-8"))


@app.get("/api/export/{format}")
async def export(format: Literal["json", "csv"]):
    lab = app.state.lab
    rows = [json.loads(r[0]) for r in lab.db.execute("SELECT record FROM samples WHERE run=? ORDER BY tick", (lab.run,))]
    if format == "json":
        content = json.dumps({"snapshot": lab.snapshot(), "samples": rows, "normalization_spans": SPANS.tolist(),
                            "definitions": {"bytes": "UTF-8 application payload; excludes WebSocket/TCP/IP headers and observer traffic",
                            "mae": "Mean absolute error per sensor", "normalized_mae": "Mean of MAE / [85,12,10]",
                            "seed": 71, "model_bootstrap": "Reported separately"}}, indent=2)
        mime = "application/json"
    else:
        buffer = io.StringIO(newline="")
        writer = csv.writer(buffer)
        writer.writerow(["tick", "exact", "reason", "temperature_truth", "vibration_truth", "power_truth",
                         "temperature_receiver", "vibration_receiver", "power_receiver", "baseline_bytes", "payload_bytes", "settings_json"])
        for row in rows:
            writer.writerow([row["tick"], row["exact"], row["reason"], *row["truth"], *row["received"],
                             row["baseline_bytes"], row["payload_bytes"], encode(row["config"])])
        content, mime = buffer.getvalue(), "text/csv"
    return Response(content, media_type=mime, headers={"Content-Disposition": f'attachment; filename="signal-loom-{lab.run}.{format}"'})


@app.websocket("/ws/dashboard")
async def dashboard(socket: WebSocket):
    await socket.accept()
    lab = app.state.lab
    lab.clients.add(socket)
    try:
        await socket.send_text(encode(lab.snapshot()))
        while True:
            await socket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        lab.clients.discard(socket)


@app.websocket("/ws/measurement")
async def measurement_channel(socket: WebSocket):
    lab, clock = app.state.lab, app.state.clock
    await socket.accept()
    if lab.channel_connected:
        await socket.close(code=1008, reason="Sender already connected")
        return
    lab.channel_connected = True
    try:
        while True:
            raw = await socket.receive_text()
            message = json.loads(raw)
            kind = message.get("kind")
            size = len(raw.encode("utf-8"))
            if kind == "init":
                await clock.halt()
                if message.get("version") != lab.predictor.version or message.get("digest") != lab.predictor.digest:
                    await socket.send_text(encode({"kind": "error", "error": "Model versions do not match"}))
                    await socket.close(code=1008)
                    return
                if lab.run != message["run"]:
                    lab.reset(message["run"])
                clock.run = message["run"]
                clock.receiver = ReceiverState(lab.predictor)
                clock.frames.clear()
                lab.control_bytes += size
                ack = encode({"kind": "ready", "version": lab.predictor.version})
                lab.control_bytes += len(ack.encode("utf-8"))
                await socket.send_text(ack)
                clock.start(message["next_at"], message["period"])
            elif kind == "measurement":
                frame = Measurement.model_validate(message).model_dump()
                if frame["run"] != clock.run or frame["tick"] <= clock.receiver.tick or frame["tick"] in clock.frames:
                    raise ValueError("Stale, duplicate, or cross-run measurement")
                frame.update({"received_at": time.monotonic(), "payload_bytes": size})
                clock.frames[frame["tick"]] = frame
                lab.measurement_bytes += size
            elif kind == "clock":
                if message["run"] != clock.run:
                    raise ValueError("Clock belongs to another run")
                lab.control_bytes += size
                await clock.halt(message["last_tick"])
                if message["active"]:
                    clock.start(message["next_at"], message["period"])
            elif kind == "stop":
                lab.control_bytes += size
                await clock.halt()
            else:
                raise ValueError("Unsupported channel message")
    except WebSocketDisconnect:
        lab.state = "disconnected"
    except (ValidationError, ValueError, KeyError) as error:
        lab.state, lab.failure = "failed", str(error)
        await socket.close(code=1008)
    finally:
        lab.channel_connected = False
        await clock.halt()


@app.websocket("/ws/observer")
async def observer(socket: WebSocket):
    await socket.accept()
    lab = app.state.lab
    lab.observer_connected = True
    try:
        while True:
            message = json.loads(await socket.receive_text())
            if message["kind"] == "state":
                if message["run"] != lab.run:
                    lab.reset(message["run"])
                lab.config = message["config"]
                lab.state = ("warming_up" if message["tick"] < WARMUP else "running") if message["active"] else ("paused" if message["tick"] else "ready")
                if message["action"] != "state":
                    lab.segments.append({"tick": message["tick"] + 1, "action": message["action"], "config": message["config"], "at": time.time()})
            elif message["kind"] == "sample":
                lab.add_observation(message)
    except WebSocketDisconnect:
        lab.state = "disconnected"
    finally:
        lab.observer_connected = False


if (ROOT / "dist").exists():
    app.mount("/", StaticFiles(directory=ROOT / "dist", html=True), name="frontend")
