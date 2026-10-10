# Signal Loom — Product Requirements Document

**Topic:** Semantic Suppression of Transmission Data with AI Reconstruction at the Receiving End  
**Version:** 1.0 · 10 October 2026  
**Status:** Implementation brief; performance targets require validation.  
**Delivery:** Local web application with a live industrial-machine simulator.

## 1. Purpose

Demonstrate how a sender can avoid transmitting predictable sensor readings while preserving meaningful machine events, and how a receiver can reconstruct omitted readings using a locally trained AI model.

The viewer should understand three things within one minute: what was suppressed, why it was suppressed, and how accurately the receiver recovered the signal. Every important number must have a visual explanation. The dashboard is a working experiment, driven by actual simulator, decision-engine, transport, and receiver events.

Primary use is a project demonstration and interactive exploration. The industrial machine is simulated; sensor values and alert thresholds are illustrative demo parameters, not certified industrial limits. The working name is Signal Loom; the full topic remains visible in project documentation and the dashboard's explanatory view.

## 2. Scope and operating constraints

- One machine with temperature, vibration, and power-consumption sensors.
- All simulation, model training, inference, transport, evaluation, and storage run locally.
- CPU inference; no GPU, external AI service, paid API, account, or physical sensor required.
- Initial dependency installation needs internet. After setup, the application runs without internet, including fonts and icons.
- Windows is the primary development and demo environment; a current desktop browser displays the dashboard.
- Actual local communication separates sender and receiver. A separate observation path supplies ground truth to evaluation and visualization.
- No authentication, cloud deployment, fleet management, hardware integration, or video/image reconstruction in version one.
- The user's stack choice is delegated to the implementer. Routine implementation and verification need no further user decisions.

## 3. Demonstration loop

1. The simulator produces a three-sensor sample every second of simulation time.
2. The sender predicts what the receiver will reconstruct using a synchronized copy of the same model and reconstructed history.
3. A policy compares the true sample with that prediction and checks meaningful events and synchronization requirements.
4. The sender transmits a complete measurement frame when required; otherwise it suppresses that frame.
5. The receiver uses received measurements and its own history to generate a reading for each tick. Each point records whether it was received or estimated.
6. An evaluator compares the receiver output with simulator truth and computes actual transmission savings and reconstruction error.
7. The dashboard renders the machine, decisions, packets, reconstructed signals, and evaluation results in real time.

Suppression means a measurement frame did not cross the monitored channel. The receiver must not receive the omitted value, a per-tick suppression notification, simulator control values, or a hidden copy of the ground-truth stream.

## 4. Selected technology stack

| Area | Choice | Purpose |
|---|---|---|
| Frontend | React + TypeScript + Vite | Component-based dashboard and a local development/build workflow |
| Styling | CSS custom properties + CSS Modules | Explicit visual tokens and custom layouts without a generic dashboard template |
| Interface motion | Motion for React + CSS | Coordinated transitions, responsive control feedback, restrained numeric interpolation |
| Pipeline and machine visuals | SVG + requestAnimationFrame | Crisp machine diagrams, packet motion, suppression marks, and accessible labels |
| Time-series charts | Recharts | Live sensor comparisons, error bands, hover inspection, and event markers |
| Icons/fonts | Lucide React; locally bundled Manrope and IBM Plex Mono | Consistent symbols and offline typography |
| Backend | Python + FastAPI + Uvicorn | Controls, run lifecycle, live observation feeds, and receiver service |
| Local communication | WebSockets | Ordered sender-to-receiver frames and separate dashboard observation feeds |
| AI model | scikit-learn HistGradientBoostingRegressor, one model per sensor | Local nonlinear forecasting with a small, CPU-friendly model |
| Numerical work | NumPy | Simulation, features, and evaluation |
| Storage/export | SQLite; CSV and JSON export | Run summaries, configuration history, event records, and reproducible results |
| Verification | pytest; TypeScript checking; Playwright browser checks | Policy/receiver correctness, boundary checks, and real dashboard interactions |

Select compatible stable package versions when scaffolding, check available local runtimes, and record exact versions in lockfiles. Do not assume that the newest major versions suit the installed runtimes.

Primary references: [Vite setup](https://vite.dev/guide/), [FastAPI WebSockets](https://fastapi.tiangolo.com/advanced/websockets/), [scikit-learn model](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.HistGradientBoostingRegressor.html), [Motion for React](https://motion.dev/docs/react).

## 5. Architecture and information boundary

```text
Simulator → Sender policy → Monitored measurement channel → Receiver + AI
     │          │                          │                     │
     └──────────┴──────── Separate observation/evaluation ────────┘
                                      │
                              Dashboard + local storage
```

The sender runs in a separate Python process from the receiver. The evaluation/dashboard backend may share the receiver service process, but the receiver model interface accepts only received frames, reconstructed history, model artifacts, and clock information. Ground-truth observation data is held outside that interface.

The frontend controls the simulator through the control API. It cannot pass those control settings into receiver inference. The local measurement channel and the observation channel have distinct routes and schemas.

At initialization, both endpoints agree on run identity, sample cadence, model version, and starting history. Receiver ticks continue using that cadence without a message from the sender for each suppressed tick. Ordered delivery, tick identifiers, and explicit resynchronization keep the sender's shadow receiver aligned. Reset/reconnect starts a new run epoch and sends initialization before inference resumes.

Schema validation rejects malformed frames. Model/version mismatches and disconnections produce explicit dashboard states; they must not quietly become successful reconstructions.

## 6. Simulator and interactive controls

The machine must behave continuously: temperature has thermal inertia, vibration changes with speed/load and faults, and power follows load. Signals combine deterministic trends and seeded stochastic noise. The receiver does not know the simulator seed.

| Control | Interaction | Effect on live behavior |
|---|---|---|
| Heating | Toggle + heating-rate slider | Starts/stops sustained heat input; temperature responds gradually |
| Signal regularity | Smooth / variable selector + randomness slider | Moves from steady or steadily rising behavior to noisy, irregular readings |
| Machine load | 0–100% slider | Changes power, vibration, and temperature over their respective response times |
| Operating state | Steady / cycling selector | Introduces repeated load patterns versus a steady operating condition |
| Overheating event | Trigger button | Applies a controlled thermal fault until cleared |
| Vibration fault | Trigger/clear button | Produces a sudden vibration spike and a persistent elevated condition |
| Suppression | On/off toggle | Compares transmitting every frame with selective transmission |
| Aggressiveness | Conservative / balanced / aggressive + slider | Changes prediction-error tolerances; event overrides remain enforced |
| Synchronization | Heartbeat interval slider | Trades periodic updates against time spent estimating without an exact refresh |
| Run controls | Start, pause, resume, reset | Controls the simulator, histories, packets, metrics, and clock together |
| Demo speed | 1× / 2× / 5× | Accelerates simulation time; labels distinguish simulation time from wall time |

“Signal regularity” is the friendly label for the user's monotonicity/smoothness idea. Helper text explains that a steady rise can remain predictable, while abrupt or random changes often require more transmissions. Actual savings are measured; the UI must not promise that every smooth pattern will produce a specific reduction.

Control updates apply by the next simulator tick, are time-stamped, and show immediate visual acknowledgement. Physical effects such as heating appear according to the simulator dynamics. Changing a slider does not reset the run. The evaluator records configuration segments so a viewer can compare behavior before and after a change.

Offer three reproducible scenario presets: **Steady operation**, **Rising heat**, and **Unpredictable load**. Presets expose their settings and can be modified. Provide a guided demo that moves through steady operation, increased suppression, added randomness, a fault, and recovery; the same controls remain usable manually.

## 7. Suppression policy and semantic meaning

Send a complete three-sensor measurement frame if any of these conditions applies, in priority order:

1. Initialization or resynchronization is required.
2. A meaningful event begins, changes severity, or clears.
3. A sensor's absolute prediction residual exceeds its current tolerance.
4. The maximum refresh interval has elapsed.
5. Suppression is disabled.

Otherwise suppress the frame. Every decision has a reason code and a readable explanation, such as “Temperature crossed the demo alert threshold,” “Vibration prediction differs by 0.7 mm/s,” or “Predictable within all three tolerances.” Display the winning reason and expose other applicable reasons in detail view.

Meaningful events include overheating, excessive vibration, and abrupt power/load transitions inferred from sensor readings. Use hysteresis for event entry/exit to avoid noisy alert flicker. A persistent fault remains visible; it does not force every sample to transmit unless residual or refresh rules require that.

The sender makes semantic decisions using actual sensor values. Simulator scenario labels must not substitute for detecting the event. Evaluation detects ground-truth events independently and measures whether and when the receiver learned about them.

Tolerance presets and demo thresholds are implementation parameters to validate and document. Sliders show units and current values. Aggressiveness never disables event overrides.

## 8. AI reconstruction

- Train one local gradient-boosted regression model per sensor on generated training runs containing varied loads, noise, heating trends, and operating cycles.
- Use lagged available/reconstructed values, rolling summaries, differences, and elapsed time since an exact sample. Exclude future values, hidden simulator state, run seeds, and scripted scenario schedules.
- Split training, calibration, and evaluation by separate runs/seeds, rather than randomly splitting neighboring time-series rows.
- Validate in recursive closed-loop operation under the actual suppression policy; one-step training accuracy alone is insufficient evidence.
- Use actual received measurements as authoritative corrections. Store forecast, received value, and correction separately so the animation does not rewrite history.
- Use hold-last-value and linear extrapolation as reference baselines in the evaluation report. Report measured AI performance against them honestly.
- Supply a documented initialization/warm-up phase and include its transmitted measurements in run accounting.
- Show an empirical error envelope calibrated on held-out closed-loop runs, with an explanation of its meaning. Until calibration succeeds, label it unavailable; do not invent a confidence percentage.
- Version model artifacts and initialization state. Record model/bootstrap distribution size separately from runtime transmission savings.

AI estimates can be wrong, particularly during unfamiliar or unpredictable behavior. The product makes those deviations visible and sends correction frames when policy conditions are met.

## 9. Dashboard composition and visual direction

The intended visual character is a precise, animated laboratory instrument: dark navy depth, legible typography, vibrant but purposeful signal colors, and a clear left-to-right story. This is a planning direction; the implementation must be visually checked before delivery.

### Layout

1. **Top strip:** project name, live/paused/disconnected status, simulation time, scenario selector, run controls.
2. **Dominant pipeline stage:** animated machine → suppression gate → packet channel → reconstruction node. Keep the process visually larger than secondary statistics.
3. **Signal comparison:** selectable sensor traces showing ground truth, received samples, AI estimates, calibrated envelope when available, and event/correction markers.
4. **Experiment controls:** an always-reachable control rail on desktop, grouped panels below the pipeline on narrower screens.
5. **Outcome strip:** transmission savings, reconstruction error, exact/estimated sample share, and event delivery, each coupled to a visual encoding.
6. **Expandable evidence:** reason log, model/baseline comparison, run segments, definitions, and export.

### Color and typography

| Role | Proposed token |
|---|---|
| Canvas | Midnight navy `#0B1220` |
| Surfaces | Slate navy `#121E30`; raised surface `#1A2940` |
| Primary text | Cool ivory `#EAF0F8` |
| Secondary text | Blue gray `#A8B8CE` |
| Exact measurement / transmission | Ice cyan `#56D9F5` |
| AI estimate / reconstruction | Soft violet `#B39DFF` |
| Suppression / efficiency | Warm amber `#F2B86B` |
| Fault / material deviation | Coral `#FF7B88` |

Use Manrope for labels and prose, IBM Plex Mono with tabular numerals for readings. Validate actual text/background contrast during implementation. Accents on filled buttons use suitable dark text where needed. Color also has shape, text, and line-style equivalents.

Avoid pure-black/neon-green styling, decorative fake terminal output, excessive glow, constant blinking, illegible tiny labels, and a wall of identical statistic cards. Keep effects local to the process they explain.

### Required visual explanations

| Element | Animation/visual | Paired number and interpretation |
|---|---|---|
| Machine | SVG rotor motion, thermal fill, vibration displacement | Current readings and machine state; rotor speed is an illustrative load proxy |
| Suppression gate | Candidate frame reaches the gate; suppressed frame dissolves into a marked local branch | Suppressed/eligible frames and the current reason |
| Channel | Actual transmitted frames move along the route; event frames have distinct markers | Sent frames, serialized bytes, and frames per second |
| Receiver | Violet forecast trace extends through missing samples; correction visibly joins an incoming measurement | Estimate/measurement value and age of last exact sample |
| Savings | Two aligned traffic bars compare full-stream baseline and actual runtime traffic | Application-payload byte savings, numerator and denominator available |
| Accuracy | Ground-truth/reconstruction overlay and an error ribbon | Sensor-specific MAE and current absolute error with units |
| Fault delivery | Sender and receiver event markers connect on a timeline | Event count and detection-to-receipt delay |
| Control change | Marker on plots and a brief pipeline acknowledgement | Setting and effective tick; actual flow then changes from real decisions |

Packet animations correspond to logged packets. If speed makes individual packets unreadable, explicitly group them and label the group count. The viewing animation is not a measurement of network latency. No decorative packet may inflate the displayed traffic totals.

Numbers interpolate briefly to aid reading but settle to the actual metric. Hover/focus reveals exact values. Continuous chart motion comes from time progression, not randomized animation. Pause freezes simulation-driven motion; connection feedback can still operate.

## 10. Metrics and accounting

Use the same frame serializer and numerical precision for the actual measurement frames and the hypothetical full-transmission baseline. Baseline frames contain the same common fields and sensors; actual event/control metadata and initialization/refresh overhead are counted when sent.

- **Frame reduction:** `1 - actual measurement frames / baseline measurement frames`.
- **Application-payload byte savings:** `1 - actual counted channel payload bytes / baseline payload bytes`. Count protocol initialization and any acknowledgement/control payload on the monitored channel; show the accounting breakdown. This metric excludes WebSocket/TCP/IP headers and is explicitly labeled as such.
- **Bootstrap size:** model/config distribution size shown separately; do not imply it is free in an end-to-end deployment.
- **Per-sensor MAE:** mean absolute error over evaluated ticks, in °C, mm/s RMS, or kW.
- **Normalized MAE:** divide each sensor MAE by its documented fixed demo span, then average across sensors. Do not describe it as “accuracy percent.”
- **Current error:** absolute difference at the selected tick.
- **Estimated share:** estimated readings divided by total receiver readings; initialization ticks are marked.
- **Event delivery:** expected, received, and missed events plus detection-to-receipt delay. Suppressed events and events still awaiting receipt cannot count as delivered.

Show whole-run and recent-window metrics, clearly labeled. Savings may be negative when overhead exceeds avoided traffic; do not clamp them to zero. Zero-denominator states show an em dash and explanation, not fabricated percentages. Exports preserve metric definitions, raw counts, configuration segments, model version, seed, and timestamps.

## 11. Lifecycle, accessibility, and performance

- Explicit states: preparing model, ready, warming up, running, paused, reconnecting, disconnected, stopped, and failed.
- Initialization and failures explain the next actionable step. Charts retain last known data with a stale marker on disconnect.
- Start/pause/resume/reset are consistent across simulator, receiver, history, and counters. Reset requires no confirmation because the current run can be exported and is locally persisted as appropriate.
- Controls support keyboard input, visible focus, readable labels, and sufficiently large hit targets. Tooltips work on focus as well as hover.
- Respect reduced-motion preferences and provide a visible motion setting. Static diagrams, discrete chart updates, and the same real numbers preserve the explanation.
- Distinguish received samples from estimates through solid/dashed traces and marker shapes, in addition to color. Do not announce every tick to screen readers; announce significant state/event changes.
- Responsive validation at approximately 390, 768, and 1440 pixels. Desktop is the main presentation view; mobile remains operable without horizontal page scrolling.
- Keep chart history and event DOM lists bounded. Pause rendering when hidden; cap animated packet objects and batch updates.
- Aim for smooth desktop animation near 60 fps, with a reduced-effects mode if hardware needs it. Report measured behavior rather than assuming a particular machine capability.

## 12. Acceptance criteria

### Functional and scientific correctness

- One documented local launch command starts the required services and makes the dashboard reachable.
- After setup, a demo runs with external network access disabled and no API keys.
- All three sensors are generated live; controls alter the underlying stream and consequent decisions, not only presentation.
- Control acknowledgement appears immediately; settings become effective by the next simulator tick. Charts mark the change without resetting counters.
- For a fixed steady-operation seed and validated balanced policy, target at least 50% fewer measurement frames and normalized MAE at most 5%. These are engineering targets, not established results; retain honest measurements if tuning cannot meet both.
- Fault onset/clearance events in the documented deterministic demo scenarios are transmitted regardless of aggressiveness. In normal local operation, target receiver awareness within one simulation tick, plus measured processing/transport delay.
- Boundary tests demonstrate that receiver inference cannot access ground truth, simulator parameters, hidden seed, or suppression audit records.
- Exported payload/count/error calculations match independent recomputation. Frame savings and byte savings remain distinct.
- Baseline model comparisons use held-out runs, identical scenarios, and consistent accounting.
- Pause/resume/reset, model mismatch, and disconnect/reconnect behave correctly without duplicate frames or cross-run history leakage.

### Dashboard quality

- The pipeline visibly explains generation, suppression, transmission, and reconstruction; it is the first-screen focal point.
- All main outcome numbers have a meaningful chart, timeline, comparison bar, or process visual.
- Received versus reconstructed points and faults remain distinguishable without color.
- Changing heating, signal regularity, load, or aggressiveness visibly changes the live experiment. A smooth-to-noisy demonstration shows measured changes in decisions and error.
- All controls work by keyboard; reduced motion preserves information; fonts/assets load offline.
- A 30-minute run at normal speed remains responsive with bounded live history and no continuously growing packet-animation list.
- Visually inspect desktop and mobile views, fix material defects in one batch, and confirm the corrected result. Avoid indefinite cosmetic iteration.

## 13. Implementation sequence and deliverables

1. **Experiment foundation:** simulator, scenario controls, clocks/epochs, serializers, deterministic fixtures, and event semantics.
2. **AI and transport:** training/calibration, shadow receiver, selective sender, isolated receiver process/interface, synchronization, and evaluation baselines.
3. **Live dashboard:** custom visual system, pipeline animation, machine visualization, charts, controls, lifecycle states, and metrics.
4. **Evidence and demo:** held-out evaluation, boundary/accounting tests, saved run/export, guided demo, offline check, and browser/visual verification.
5. **Delivery:** runnable project, dependency locks, locally generated model, launch instructions, architecture explanation, metric definitions, and a short demo script.

The project should be presentable without special preparation: launch, start steady operation, increase suppression, increase randomness, introduce heating/vibration faults, clear them, and export the measured result.

## 14. Assistance expectations

No further user assistance is expected for the agreed local scope. The implementer chooses routine design and engineering details and performs setup, implementation, and verification.

User action could become necessary only for an actual environment restriction requiring manual administration, or an explicitly requested scope expansion involving hardware, private data/accounts, or public deployment. Those are conditional possibilities, not prerequisites for this project. No account connection, credential, cloud budget, or additional design interview is needed to implement this PRD.
