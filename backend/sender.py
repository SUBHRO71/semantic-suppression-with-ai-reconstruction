"""Independent sender process. Truth travels only over the observer socket."""
import asyncio
import queue
import time
import uuid
from websockets.asyncio.client import connect
from backend.domain import Config, Simulator, Policy, PRESETS, encode
from backend.model import Predictor, ReceiverState


async def run_sender(commands, port):
    predictor = Predictor()
    async with connect(f"ws://127.0.0.1:{port}/ws/measurement", max_size=2**20) as channel, \
               connect(f"ws://127.0.0.1:{port}/ws/observer", max_size=2**20) as observer:
        config = Config()
        run, tick, active, initialized = str(uuid.uuid4())[:8], 0, False, False
        sim, policy, shadow = Simulator(), Policy(), ReceiverState(predictor)
        deadline = 0.0

        async def observe_state(action="state"):
            await observer.send(encode({"kind": "state", "run": run, "tick": tick,
                "active": active, "config": config.dict(), "action": action}))

        async def initialize():
            nonlocal deadline, initialized
            deadline = time.monotonic() + 0.3
            await channel.send(encode({"kind": "init", "run": run, "version": predictor.version,
                "digest": predictor.digest, "period": 1 / config.speed, "next_at": deadline}))
            response = __import__("json").loads(await channel.recv())
            if response.get("kind") != "ready":
                raise ValueError(response.get("error", "Receiver initialization failed"))
            initialized = True

        async def clock():
            nonlocal deadline
            deadline = time.monotonic() + 0.18
            await channel.send(encode({"kind": "clock", "run": run, "active": active,
                "last_tick": tick, "period": 1 / config.speed, "next_at": deadline}))

        await observe_state()
        while True:
            changed = False
            while True:
                try:
                    command = commands.get_nowait()
                except queue.Empty:
                    break
                if command.get("action") == "shutdown":
                    return
                action = command.get("action", "configure")
                old_speed = config.speed
                if "preset" in command:
                    config = Config(**PRESETS[command["preset"]])
                for key, value in command.get("settings", {}).items():
                    setattr(config, key, value)
                if action == "reset":
                    active, initialized, tick = False, False, 0
                    run = str(uuid.uuid4())[:8]
                    sim, policy, shadow = Simulator(), Policy(), ReceiverState(predictor)
                    await channel.send(encode({"kind": "stop"}))
                elif action == "pause":
                    active = False
                    if initialized:
                        await clock()
                elif action in ("start", "resume"):
                    active = True
                    if not initialized:
                        await initialize()
                    else:
                        await clock()
                elif active and config.speed != old_speed:
                    await clock()
                await observe_state(action)
                changed = True
            if active and time.monotonic() >= deadline:
                tick += 1
                truth = sim.step(tick, config)
                decision = policy.decide(tick, truth, shadow.forecast(), config)
                packet = {"kind": "measurement", "run": run, "tick": tick,
                          "values": truth, "sent_at": round(time.monotonic(), 6)}
                baseline_bytes = len(encode(packet).encode("utf-8"))
                if decision["sent"]:
                    if decision["events"]:
                        packet["events"] = decision["events"]
                    await channel.send(encode(packet))
                shadow.step(tick, truth if decision["sent"] else None)
                await observer.send(encode({"kind": "sample", "run": run, "tick": tick,
                    "truth": truth, "decision": decision, "config": config.dict(),
                    "baseline_bytes": baseline_bytes, "detected_at": packet["sent_at"]}))
                deadline += 1 / config.speed
                # Preserve tick order without flooding after an OS suspension.
                if deadline < time.monotonic() - 1 / config.speed:
                    await clock()
            await asyncio.sleep(0.005 if active else 0.03)


def sender_main(commands, port):
    try:
        asyncio.run(run_sender(commands, port))
    except Exception:
        import traceback
        traceback.print_exc()
        raise
