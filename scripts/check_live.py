"""Integration check against the running local service, including real subprocess transport."""
import json
import time
from urllib.request import Request, urlopen

BASE = "http://127.0.0.1:8000"


def state():
    return json.load(urlopen(BASE + "/api/state"))


def control(action="configure", settings=None, preset=None):
    value = {"action": action, "settings": settings or {}}
    if preset:
        value["preset"] = preset
    return json.load(urlopen(Request(BASE + "/api/control", data=json.dumps(value).encode(), headers={"Content-Type": "application/json"})))


def until(predicate, timeout=15):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        value = state()
        if value["state"] == "failed":
            raise AssertionError(value["failure"])
        if predicate(value):
            return value
        time.sleep(.1)
    raise AssertionError("Timed out waiting for live state")


def check():
    until(lambda s: s["sender_connected"])
    control("reset")
    until(lambda s: s["state"] == "ready" and s["metrics"]["ticks"] == 0)
    control("start", {"speed": 5})
    value = until(lambda s: s["metrics"]["ticks"] >= 30)
    assert all(r["exact"] for r in value["series"][:8]), "Warm-up frames arrived late"
    assert value["metrics"]["suppressed"] > 10
    control(settings={"randomness": .95, "cycling": True})
    start = value["metrics"]["ticks"]
    value = until(lambda s: s["metrics"]["ticks"] >= start + 15)
    assert value["config"]["randomness"] == .95
    control(settings={"vibration_fault": True})
    value = until(lambda s: s["metrics"]["events_expected"] > 0 and s["faults"]["vibration"])
    assert value["metrics"]["events_delivered"] == value["metrics"]["events_expected"]
    control("pause")
    value = until(lambda s: s["state"] == "paused")
    ticks = value["metrics"]["ticks"]
    time.sleep(.7)
    assert state()["metrics"]["ticks"] == ticks
    control("resume", {"speed": 2})
    until(lambda s: s["metrics"]["ticks"] >= ticks + 3)
    control(settings={"speed": 5, "suppression": False})
    value = until(lambda s: s["metrics"]["ticks"] >= ticks + 8)
    assert all(row["exact"] for row in value["series"][-4:])
    control("pause")
    until(lambda s: s["state"] == "paused")
    export = json.load(urlopen(BASE + "/api/export/json"))
    rows = export["samples"]
    assert len(rows) == export["snapshot"]["metrics"]["ticks"]
    assert sum(row["baseline_bytes"] for row in rows) == export["snapshot"]["metrics"]["baseline_bytes"]
    assert sum(row["payload_bytes"] for row in rows) == export["snapshot"]["metrics"]["measurement_bytes"]
    assert sum(row["exact"] for row in rows) == export["snapshot"]["metrics"]["sent"]
    print(json.dumps({"result": "passed", "ticks": len(rows), "events": export["snapshot"]["metrics"]["events_delivered"],
                      "checks": ["separate-process transport", "warmup", "suppression", "noise", "fault overrides", "pause", "resume", "speed change", "disabled suppression", "export accounting"]}))
    control("reset")


if __name__ == "__main__":
    check()
