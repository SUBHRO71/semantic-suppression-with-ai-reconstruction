# Validation evidence

All results concern the simulated machine, not physical sensor deployments.

- `report.json`: disjoint training/calibration/evaluation seeds; AI, hold-last, and linear closed-loop baselines. Model artifacts are generated locally and excluded from Git.
- `soak.json`: 1,802 ticks over the actual separate-process measurement channel, at 5× speed. 360.7 seconds of wall time; 30 minutes of simulation, not a 30-minute wall-time soak. All 75 independently detected events were delivered. Live history stayed at 180 entries and the log at 30.
- `browser-audit.json`: production assets loaded without external requests; no page errors; no horizontal overflow at 390/768/1440 pixels after responsive chart layout settled. Three-second headless Chromium animation sampling averaged approximately 60 fps. This does not guarantee every device's frame rate.

The final functional suite includes eight backend tests and three browser tests. Browser checks cover real controls, faults, 5× packet lifetime, adaptive axis labels, keyboard sliders, reduced motion, bundled fonts, benchmark errors/retry, stale feed handling, and export accounting. `scripts/check_live.py` separately checks actual subprocess transport and lifecycle changes.

Regenerate benchmarks with `python scripts/train.py`; execute the checks documented in the project README. Screenshots and interactive browser reports stay local under ignored `.impeccable/review/`, `test-results/`, and `playwright-report/`.
