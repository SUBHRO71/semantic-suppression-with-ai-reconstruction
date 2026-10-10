"""Simulator and semantic policy. Only the sender imports the simulator."""
from dataclasses import asdict, dataclass
import json
import math
import numpy as np

SENSORS = ("temperature", "vibration", "power")
SPANS = np.array([85.0, 12.0, 10.0])
UNITS = ("°C", "mm/s", "kW")
WARMUP = 8


def encode(value: dict) -> str:
    return json.dumps(value, separators=(",", ":"), sort_keys=True, allow_nan=False)


@dataclass
class Config:
    load: float = 0.55
    heating: bool = False
    heating_rate: float = 0.35
    randomness: float = 0.05
    cycling: bool = False
    overheat: bool = False
    vibration_fault: bool = False
    suppression: bool = True
    aggressiveness: float = 0.6
    heartbeat: int = 12
    speed: int = 1

    def dict(self):
        return asdict(self)


PRESETS = {
    "steady": Config().dict(),
    "heat": Config(heating=True, heating_rate=0.65, load=0.7).dict(),
    "variable": Config(randomness=0.85, cycling=True, load=0.72).dict(),
}


class Simulator:
    def __init__(self, seed=71):
        self.rng = np.random.default_rng(seed)
        self.values = np.array([55.2, 1.79, 3.92])

    def step(self, tick: int, config: Config) -> list[float]:
        load = np.clip(config.load + (0.2 * math.sin(tick / 9) if config.cycling else 0), 0, 1)
        target_temp = 42 + 24 * load
        self.values[0] += (target_temp - self.values[0]) * 0.022
        if config.heating:
            self.values[0] += config.heating_rate
        if config.overheat:
            self.values[0] += (94 - self.values[0]) * 0.3
        target_vibration = 0.8 + 1.8 * load + (5.5 if config.vibration_fault else 0)
        self.values[1] += (target_vibration - self.values[1]) * 0.85
        self.values[2] += (1.5 + 4.4 * load - self.values[2]) * 0.7
        noise = self.rng.normal(size=3) * np.array([0.025, 0.015, 0.015])
        noise += self.rng.normal(size=3) * config.randomness * np.array([1.1, 0.65, 0.7])
        observed = np.clip(self.values + noise, [25, 0, 0], [110, 12, 10])
        return np.round(observed, 4).tolist()


class EventDetector:
    def __init__(self):
        self.hot = False
        self.vibration = False
        self.previous_power = None

    def detect(self, values: list[float]) -> list[str]:
        t, v, p = values
        events = []
        hot = t >= (76 if self.hot else 80)
        vibration = v >= (4.8 if self.vibration else 5.5)
        if hot != self.hot:
            events.append("overheat_started" if hot else "overheat_cleared")
        if vibration != self.vibration:
            events.append("vibration_started" if vibration else "vibration_cleared")
        if self.previous_power is not None and abs(p - self.previous_power) > 1.4:
            events.append("power_transition")
        self.hot, self.vibration, self.previous_power = hot, vibration, p
        return events


class Policy:
    def __init__(self):
        self.last_sent = 0
        self.detector = EventDetector()

    @staticmethod
    def tolerances(config: Config) -> np.ndarray:
        return np.array([0.25, 0.06, 0.07]) + config.aggressiveness * np.array([2.75, 0.64, 0.48])

    def decide(self, tick, truth, forecast, config):
        events = self.detector.detect(truth)
        errors = np.abs(np.array(truth) - forecast)
        thresholds = self.tolerances(config)
        if tick <= WARMUP:
            reason, detail = "warmup", f"Learning the starting signal · {tick}/{WARMUP} exact frames"
        elif events:
            reason, detail = "event", ", ".join(e.replace("_", " ") for e in events)
        elif not config.suppression:
            reason, detail = "disabled", "Suppression off · transmit every reading"
        elif np.any(errors > thresholds):
            index = int(np.argmax(errors / thresholds))
            reason, detail = "deviation", f"{SENSORS[index].title()} differs by {errors[index]:.2f} {UNITS[index]}"
        elif tick - self.last_sent >= config.heartbeat:
            reason, detail = "heartbeat", "Periodic exact refresh keeps both endpoints aligned"
        else:
            reason, detail = "predictable", "All three signals are within prediction tolerances"
        sent = reason != "predictable"
        if sent:
            self.last_sent = tick
        return {"sent": sent, "reason": reason, "detail": detail, "events": events,
                "tolerances": thresholds.tolist(), "residuals": errors.tolist()}
