import inspect
import json
import numpy as np
import pytest
from backend.domain import Config, Simulator, Policy, EventDetector, encode, SPANS
from backend.model import Predictor, ReceiverState
from backend.app import Lab, Measurement, Settings
from pydantic import ValidationError
from scripts.train import rollout


@pytest.fixture(scope="module")
def predictor():
    return Predictor()


def test_repeatable_simulator_and_control_effects():
    a, b = Simulator(71), Simulator(71)
    assert [a.step(i, Config()) for i in range(1, 15)] == [b.step(i, Config()) for i in range(1, 15)]
    stable, hot = Simulator(71), Simulator(71)
    for i in range(1, 50):
        normal = stable.step(i, Config())
        heating = hot.step(i, Config(heating=True, heating_rate=1))
    assert heating[0] > normal[0] + 20


def test_events_override_aggressive_suppression_and_clear():
    policy = Policy()
    c = Config(aggressiveness=1)
    policy.last_sent = 9
    policy.detector.detect([60, 2, 4])
    d = policy.decide(10, [85, 2, 4], [85, 2, 4], c)
    assert d["sent"] and d["reason"] == "event" and "overheat_started" in d["events"]
    assert "overheat_cleared" in policy.decide(11, [74, 2, 4], [74, 2, 4], c)["events"]


def test_hysteresis_and_heartbeat():
    detector = EventDetector()
    assert detector.detect([81, 2, 4]) == ["overheat_started"]
    assert detector.detect([79, 2, 4]) == []
    assert detector.detect([75, 2, 4]) == ["overheat_cleared"]
    p = Policy()
    p.last_sent = 8
    c = Config(heartbeat=12)
    assert not p.decide(19, [55, 2, 4], [55, 2, 4], c)["sent"]
    assert p.decide(20, [55, 2, 4], [55, 2, 4], c)["reason"] == "heartbeat"


def test_receiver_is_causal_and_rejects_hidden_inputs(predictor):
    assert list(inspect.signature(ReceiverState.step).parameters) == ["self", "tick", "measurement"]
    with pytest.raises(ValidationError):
        Measurement.model_validate({"kind": "measurement", "run": "x", "tick": 1,
            "values": [55, 2, 4], "sent_at": 1, "truth": [55, 2, 4]})
    with pytest.raises(ValidationError):
        Measurement.model_validate({"kind": "measurement", "run": "x", "tick": 1,
            "values": [float("nan"), 2, 4], "sent_at": 1})
    r = ReceiverState(predictor)
    r.step(1, [55, 2, 4])
    assert r.step(2)["exact"] is False
    with pytest.raises(ValueError):
        r.step(4)


def test_shadow_receiver_stays_aligned(predictor):
    sender, receiver = ReceiverState(predictor), ReceiverState(predictor)
    sim, policy = Simulator(), Policy()
    for tick in range(1, 150):
        truth = sim.step(tick, Config(heating=True))
        decision = policy.decide(tick, truth, sender.forecast(), Config(heating=True))
        measurement = truth if decision["sent"] else None
        assert sender.step(tick, measurement) == receiver.step(tick, measurement)


def test_heldout_steady_target(predictor):
    result, _ = rollout(predictor, 900, Config())
    assert result["frame_savings"] >= 0.5
    assert result["normalized_mae"] <= 0.05


def test_evaluator_counts_exact_bytes_and_errors(predictor):
    lab = Lab(predictor, ":memory:")
    lab.reset("test")
    lab.control_bytes = 200
    lab.measurement_bytes = 150
    obs = {"run": "test", "tick": 1, "truth": [55, 2, 4], "detected_at": 1,
           "baseline_bytes": 100, "config": Config().dict(),
           "decision": {"reason": "predictable", "detail": "predictable"}}
    out = {"run": "test", "tick": 1, "values": [56, 2.2, 4.3], "forecast": [56, 2.2, 4.3],
           "exact": False, "age": 1, "events": [], "received_at": None, "payload_bytes": 0}
    lab.add_output(out)
    lab.add_observation(obs)
    metrics = lab.snapshot()["metrics"]
    assert metrics["actual_bytes"] == 350
    assert metrics["byte_savings"] == -2.5
    np.testing.assert_allclose(metrics["mae"], [1, 0.2, 0.3])
    assert metrics["normalized_mae"] == pytest.approx(np.mean(np.array([1, 0.2, 0.3]) / SPANS))
    stored = json.loads(lab.db.execute("SELECT record FROM samples").fetchone()[0])
    assert stored["exact"] is False and stored["baseline_bytes"] == 100
    lab.db.close()


def test_control_validation():
    for settings in ({"load": 2}, {"speed": 3}, {"heartbeat": 0}, {"hidden_seed": 1}):
        with pytest.raises(ValidationError):
            Settings.model_validate(settings)
