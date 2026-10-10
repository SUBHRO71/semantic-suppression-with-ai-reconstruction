# Product

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
Delegated by the user: React/TypeScript/Vite, Python/FastAPI, local scikit-learn models, WebSockets, and SQLite. See PRD.md for the accepted stack and constraints.

## Users
Project presenters and viewers exploring an interactive demonstration of semantic suppression and AI reconstruction.

## Product Purpose
Explain and measure how suppressing predictable sensor frames reduces transmission while preserving meaningful events and reconstructing omitted values.

## Operating Context
An offline-capable local Windows demo after dependency setup, using a simulated industrial machine with temperature, vibration, and power sensors.

## Capabilities and Constraints
The approved PRD defines the scope. Controls alter heating, randomness, load, faults, cadence, and suppression in real time. Receiver inference must never access ground truth or hidden simulator settings. Measured outcomes take precedence over target claims.

## Brand Commitments
Working name: Signal Loom. Dark mode with several purposeful accent colors. Animation must explain the experiment, and important numbers must have meaningful visual companions.

## Evidence on Hand
PRD.md is approved. evaluation/report.json contains held-out synthetic benchmarks against hold-last and linear baselines. Code, separate-process transport, browser controls, reduced motion, and offline assets have been checked. All sensor values are simulated; measured results are not guarantees for physical sensors.

## Product Principles
- Explain causality through visible flow and real events.
- Keep estimates distinct from measurements.
- Expose the savings/error trade-off honestly.
- Prefer local, reproducible operation.

## Accessibility & Inclusion
Keyboard controls, reduced motion, readable contrast, and redundant text/shape encodings for color.
