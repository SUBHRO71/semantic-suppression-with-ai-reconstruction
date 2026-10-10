# Signal Loom

A local, animated demonstration of **semantic suppression of transmission data with AI reconstruction at the receiving end**.

A simulated machine generates temperature, vibration, and power readings. A separate sender process transmits meaningful events, prediction deviations, and periodic refreshes. The receiver reconstructs omitted readings using local gradient-boosted forecasting models. The dashboard exposes the whole journey and measures transmission savings, reconstruction error, and event delivery.

## Run locally

Requires Python 3.11–3.13 and Node.js 22.12 or newer in the 22.x line. The project was verified with Python 3.13.7 and Node 22.19.0 on Windows.

```powershell
python -m pip install -r requirements.txt -c requirements-lock.txt
npm ci
npm start
```

Open [Signal Loom](http://127.0.0.1:8000). On the first launch, the launcher trains the local model and builds the dashboard. Later launches reuse them. Dependencies need internet during installation; the finished demo needs no account, key, GPU, or internet connection. Fonts and icons are bundled locally.

For development, use `python scripts/launch.py --dev` and open [the development dashboard](http://127.0.0.1:5173). Ctrl+C stops the launcher and its child services. If either port is occupied, close the existing Signal Loom instance first.

## Try the experiment

1. Start **Steady operation** and wait for the eight exact warm-up frames.
2. Raise suppression aggressiveness. Compare the full-stream/actual traffic bars and received/estimated sample strip.
3. Switch signal regularity to **Variable** or increase randomness. Watch more deviation frames cross the channel.
4. Turn on heating or increase load. Inspect the temperature/power plots and corrections.
5. Trigger a vibration spike or overheat fault. Event transitions bypass suppression even at maximum aggressiveness.
6. Pause, inspect exact readings, view the held-out benchmark, and export CSV or the JSON run report.

The guided demo performs a similar sequence automatically. Controls remain available and any manual experiment change ends the guided sequence.

## What is actually measured

- **Frame savings:** omitted measurement frames compared with transmitting every simulator tick.
- **Payload savings:** UTF-8 serialized application bytes, including initialization, acknowledgement, and lifecycle clock messages on the monitored channel. WebSocket/TCP/IP headers and the separate dashboard observation feed are excluded.
- **MAE:** per-sensor mean absolute reconstruction error, in °C, mm/s RMS, and kW.
- **Normalized MAE:** average of those errors divided by the fixed demo spans `[85, 12, 10]`; this is not an accuracy percentage.
- **Events:** ground-truth transitions independently checked against actual received event frames; delay is measured local transport time, not animation travel time.
- **Bootstrap:** model file size shown separately from runtime transmission savings.

Savings can initially be negative because initialization has a real cost. The calibration envelope is the empirical 90th percentile of absolute errors on estimated calibration ticks, not a guaranteed confidence interval. Sensor thresholds describe this simulated machine.

## Architecture

```text
Sender process: simulator + policy + synchronized shadow forecast
        │ measurements only when required
        ▼
Receiver: independent clock + causal forecast + exact corrections
        │
        ├──── evaluator ─── SQLite and CSV/JSON
        │          ▲
        │          └──── separate sender observation feed (truth/audit)
        ▼
Animated React dashboard
```

Receiver inference accepts only measurements, reconstructed history, model artifacts, and cadence information. It never receives hidden simulator settings, random seeds, or suppressed values. Its independent clock has a bounded playout buffer for local scheduling jitter. Clock changes and pause/resume messages are counted channel traffic. Packet animation depicts actual logged decisions; its travel time is illustrative.

The live chart keeps at most 180 points, the reason list at most 30 entries, and only a few packet objects animate at a time. Full run records are stored in ignored `data/runs.sqlite3`; models are generated in ignored `models/`. Training, calibration, and evaluation use disjoint seeds. See [the approved PRD](PRD.md) and [design contract](DESIGN.md).

## Verify changes

```powershell
python scripts/train.py
python -m pytest tests -q
npm run build
```

With the development app running:

```powershell
python scripts/check_live.py
npx playwright install chromium
npm run test:ui
python scripts/soak.py
```

The live integration check exercises the real subprocess/channel, warm-up, suppression, noise, fault overrides, pause/resume, speed changes, and exported accounting. Browser tests exercise desktop/mobile controls, keyboard sliders, reduced motion, locally bundled assets, and screenshots. The soak check runs 1,800 simulation ticks at 5×, about six minutes of wall time, with changing noise/heating/faults; it is not a claim of a 30-minute wall-time test.

These checks control the active demo and reset its run. Export anything you want to keep before executing them. Test screenshots/reports remain local and ignored.

## Results and reproducibility

`evaluation/report.json` records the model configuration and held-out results. The initial three steady evaluation runs suppressed **88.75% of measurement frames** with an average normalized MAE of approximately **0.00245**. The variable scenario suppressed about **15.56%**. These are reproducible synthetic results, not guarantees for real sensors.

Hold-last-value and linear extrapolation are also measured. A simple baseline can outperform AI on a steady signal; the benchmark reports that comparison rather than hiding it. Model versions, serializer precision, policy settings, and simulator seed are recorded for interpretation of the exported evidence.
