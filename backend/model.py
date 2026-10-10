"""Receiver-only state: no simulator, controls, truth, or random seed inputs."""
from collections import deque
import hashlib
import pickle
from pathlib import Path
import numpy as np
from threadpoolctl import threadpool_limits

MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "forecaster.pkl"
VERSION = "gradient-delta-v1"
LIMITS = np.array([2.5, 1.0, 1.2])


def features(history, age):
    h = np.asarray(history, dtype=float)
    if len(h) < 4:
        h = np.vstack([np.repeat(h[:1], 4 - len(h), axis=0), h])
    diffs = np.diff(h[-6:], axis=0)
    return np.concatenate([h[-1] / [85, 12, 10], diffs[-1], diffs[-2],
                           diffs.mean(axis=0), diffs.std(axis=0), [min(age, 30) / 30]])


class Predictor:
    def __init__(self, path=MODEL_PATH):
        # Keep the local CPU pool bounded once, rather than reconfiguring DLLs every tick.
        self.thread_limits = threadpool_limits(limits=1)
        with open(path, "rb") as stream:
            artifact = pickle.load(stream)
        if artifact["version"] != VERSION:
            raise ValueError("Model version mismatch. Retrain the local model.")
        self.models = artifact["models"]
        self.envelope = artifact.get("envelope")
        self.version = VERSION
        self.bootstrap_bytes = Path(path).stat().st_size
        self.digest = hashlib.sha256(Path(path).read_bytes()).hexdigest()[:12]

    def predict(self, history, age):
        if not history:
            return np.array([55.2, 1.79, 3.92])
        if len(history) < 4:
            return np.array(history[-1])
        x = features(history, age).reshape(1, -1)
        delta = np.array([model.predict(x)[0] for model in self.models])
        return np.clip(np.array(history[-1]) + np.clip(delta, -LIMITS, LIMITS), [25, 0, 0], [110, 12, 10])


class ReceiverState:
    """A causal reconstruction interface, deliberately isolated from evaluator truth."""
    def __init__(self, predictor):
        self.predictor = predictor
        self.history = deque(maxlen=24)
        self.last_exact = 0
        self.tick = 0
        self.cached_forecast = None

    def forecast(self):
        if self.cached_forecast is None:
            self.cached_forecast = self.predictor.predict(self.history, self.tick + 1 - self.last_exact)
        return self.cached_forecast.copy()

    def step(self, tick, measurement=None):
        if tick != self.tick + 1:
            raise ValueError(f"Expected receiver tick {self.tick + 1}, got {tick}")
        forecast = self.forecast()
        values = np.asarray(measurement if measurement is not None else forecast)
        if measurement is not None:
            self.last_exact = tick
        self.history.append(values.tolist())
        self.tick = tick
        self.cached_forecast = None
        return {"tick": tick, "values": np.round(values, 4).tolist(),
                "forecast": np.round(forecast, 4).tolist(), "exact": measurement is not None,
                "age": tick - self.last_exact}
