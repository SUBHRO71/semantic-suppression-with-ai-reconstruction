"""Train and evaluate using disjoint simulator seeds and closed-loop forecasts."""
import os
os.environ.setdefault("OMP_NUM_THREADS", "1")
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import json
import pickle
import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor
from threadpoolctl import threadpool_limits
from backend.domain import Config, Simulator, Policy, SPANS
from backend.model import MODEL_PATH, VERSION, Predictor, ReceiverState, features


def rollout(predictor, seed, config, length=240, baseline=None):
    sim, policy, receiver = Simulator(seed), Policy(), ReceiverState(predictor)
    errors, estimated_errors, sent = [], [], 0
    for tick in range(1, length + 1):
        if baseline == "hold":
            forecast = np.array(receiver.history[-1]) if receiver.history else receiver.forecast()
        elif baseline == "linear" and len(receiver.history) >= 2:
            forecast = np.clip(2 * np.array(receiver.history[-1]) - receiver.history[-2], [25, 0, 0], [110, 12, 10])
        else:
            forecast = receiver.forecast()
        truth = sim.step(tick, config)
        decision = policy.decide(tick, truth, forecast, config)
        # Baselines use the same policy but their own available history.
        if baseline and not decision["sent"]:
            receiver.tick = tick
            receiver.history.append(forecast.tolist())
            output = {"values": forecast}
        else:
            output = receiver.step(tick, truth if decision["sent"] else None)
        error = np.abs(np.array(truth) - output["values"])
        errors.append(error)
        sent += int(decision["sent"])
        if not decision["sent"]:
            estimated_errors.append(error)
    mae = np.mean(errors, axis=0)
    return {"seed": seed, "frames": length, "sent": sent, "frame_savings": 1 - sent / length,
            "mae": mae.tolist(), "normalized_mae": float(np.mean(mae / SPANS))}, estimated_errors


def train():
    rng = np.random.default_rng(1701)
    xs, ys = [], []
    for seed in range(100, 140):
        sim = Simulator(seed)
        history = []
        config = Config()
        for tick in range(1, 261):
            if tick % 40 == 1:
                config = Config(load=float(rng.uniform(0.15, 0.95)),
                                heating=bool(rng.integers(0, 2)), heating_rate=float(rng.uniform(0, 0.8)),
                                randomness=float(rng.uniform(0, 0.3)), cycling=bool(rng.integers(0, 2)))
            truth = sim.step(tick, config)
            if len(history) >= 6:
                xs.append(features(history[-24:], int(rng.integers(1, 13))))
                ys.append(np.array(truth) - history[-1])
            history.append(truth)
    x, y = np.array(xs), np.array(ys)
    with threadpool_limits(limits=1):
        models = [HistGradientBoostingRegressor(max_iter=75, max_leaf_nodes=15, max_bins=64,
                   l2_regularization=2, learning_rate=0.07, random_state=71).fit(x, y[:, i]) for i in range(3)]
    MODEL_PATH.parent.mkdir(exist_ok=True)
    artifact = {"version": VERSION, "models": models, "training_seeds": list(range(100, 140))}
    MODEL_PATH.write_bytes(pickle.dumps(artifact))
    predictor = Predictor()
    calibration = []
    for seed in range(300, 305):
        _, errors = rollout(predictor, seed, Config(randomness=(seed - 300) * 0.12, cycling=seed % 2 == 0))
        calibration.extend(errors)
    artifact["envelope"] = np.quantile(calibration, 0.9, axis=0).tolist()
    artifact["calibration_seeds"] = list(range(300, 305))
    MODEL_PATH.write_bytes(pickle.dumps(artifact))
    predictor = Predictor()
    results = {}
    for name, config in {"steady": Config(), "heat": Config(heating=True, heating_rate=0.65),
                         "variable": Config(randomness=0.85, cycling=True)}.items():
        results[name] = {}
        for method in ("ai", "hold", "linear"):
            runs = [rollout(predictor, seed, config, baseline=None if method == "ai" else method)[0]
                    for seed in range(500, 503)]
            results[name][method] = {"frame_savings": float(np.mean([r["frame_savings"] for r in runs])),
                                     "normalized_mae": float(np.mean([r["normalized_mae"] for r in runs])),
                                     "mae": np.mean([r["mae"] for r in runs], axis=0).tolist(), "runs": runs}
    report = {"model": VERSION, "training_seeds": list(range(100, 140)),
              "calibration_seeds": list(range(300, 305)), "evaluation_seeds": list(range(500, 503)),
              "envelope": artifact["envelope"], "envelope_note": "90th percentile absolute errors on estimated calibration ticks; not a probability guarantee",
              "normalization_spans": SPANS.tolist(), "results": results}
    Path("evaluation").mkdir(exist_ok=True)
    Path("evaluation/report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({k: v["ai"] for k, v in results.items()}, indent=2))


if __name__ == "__main__":
    train()
