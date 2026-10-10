"""30 minutes of simulation over the actual local channel at 5x speed (~6 wall minutes)."""
from pathlib import Path
import json
import sys
import time
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.check_live import state, control, until


def main():
    until(lambda s: s["sender_connected"])
    control("reset")
    until(lambda s: s["state"] == "ready" and s["metrics"]["ticks"] == 0)
    control("start", {"speed": 5}, "steady")
    started = time.monotonic()
    checks = {200: {"heating": True}, 400: {"randomness": .85, "cycling": True},
              600: {"vibration_fault": True}, 700: {"vibration_fault": False},
              900: {"overheat": True}, 1000: {"overheat": False, "heating": False},
              1200: {"randomness": .05, "cycling": False}, 1500: {"aggressiveness": .95}}
    done = set()
    while True:
        value = state()
        tick = value["metrics"]["ticks"]
        assert value["state"] != "failed", value["failure"]
        assert len(value["series"]) <= 180 and len(value["logs"]) <= 30
        for target, settings in checks.items():
            if tick >= target and target not in done:
                control(settings=settings)
                done.add(target)
                print(f"tick {tick}: {settings}", flush=True)
        if tick >= 1800:
            break
        if time.monotonic() - started > 430:
            raise AssertionError("Simulation stalled during soak")
        time.sleep(.3)
    control("pause")
    final = until(lambda s: s["state"] == "paused")
    assert final["metrics"]["events_expected"] == final["metrics"]["events_delivered"]
    result = {"passed": True, "simulation_seconds": final["metrics"]["ticks"],
              "wall_seconds": round(time.monotonic() - started, 1), "speed": 5,
              "live_history_bound": len(final["series"]), "log_bound": len(final["logs"]),
              "metrics": final["metrics"]}
    Path("evaluation/soak.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result), flush=True)


if __name__ == "__main__":
    main()
