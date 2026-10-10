import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Snapshot } from "./types";
import styles from "./styles.module.css";

const sensors = [
  { name: "Temperature", unit: "°C", index: 0 },
  { name: "Vibration", unit: "mm/s", index: 1 },
  { name: "Power", unit: "kW", index: 2 },
];
export function SignalChart({
  data,
  available,
}: {
  data: Snapshot;
  available: boolean;
}) {
  const [selected, setSelected] = useState(0);
  const [table, setTable] = useState(false);
  const sensor = sensors[selected];
  const points = useMemo(
    () =>
      data.series.slice(-90).map((row) => ({
        tick: row.tick,
        truth: row.truth[selected],
        reconstructed: row.received[selected],
        exact: row.exact ? row.received[selected] : null,
        band:
          data.model.envelope && !row.exact
            ? [
                row.received[selected] - data.model.envelope[selected],
                row.received[selected] + data.model.envelope[selected],
              ]
            : null,
      })),
    [data.series, data.model.envelope, selected],
  );
  const latest = data.series.at(-1);
  const values = points.flatMap((p) => [
    p.truth,
    p.reconstructed,
    ...(p.band ?? []),
  ]);
  const span = values.length ? Math.max(...values) - Math.min(...values) : 1;
  const digits = span < 0.1 ? 3 : span < 1 ? 2 : span < 10 ? 1 : 0;
  const visibleRows = data.series.slice(-90);
  return (
    <section className={styles.signalChart} aria-labelledby="signal-title">
      <div className={styles.sectionHeading}>
        <h2 id="signal-title">Original meets reconstructed</h2>
        <span className={available ? styles.smallMuted : styles.coral}>
          {available
            ? "Last 90 simulation seconds"
            : "Stale · live feed unavailable"}
        </span>
      </div>
      <div className={styles.chartToolbar}>
        <div className={styles.sensorTabs} aria-label="Sensor selection">
          {sensors.map((s, i) => (
            <button
              key={s.name}
              aria-pressed={selected === i}
              onClick={() => setSelected(i)}
            >
              {s.name}
            </button>
          ))}
        </div>
        <span className={styles.errorReading}>
          Current error{" "}
          <strong>
            {latest ? latest.error[selected].toFixed(3) : "—"} {sensor.unit}
          </strong>
        </span>
      </div>
      <div className={styles.chartLegend}>
        <span>
          <i className={styles.truthKey} />
          Original
        </span>
        <span>
          <i className={styles.estimateKey} />
          Receiver / AI
        </span>
        <span>
          <i className={styles.exactKey} />
          Exact sample
        </span>
        <span>
          <i className={styles.correctionKey} />
          Correction
        </span>
        <span>
          <i className={styles.eventKey} />
          Event
        </span>
        {data.model.envelope && (
          <span>
            <i className={styles.bandKey} />
            Calibration envelope
          </span>
        )}
      </div>
      {points.length ? (
        <div
          className={styles.plot}
          role="img"
          aria-label={`${sensor.name} in ${sensor.unit}. Mean absolute error ${data.metrics.mae[selected].toFixed(3)} ${sensor.unit}.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={points}
              margin={{ top: 14, right: 12, bottom: 0, left: -15 }}
              accessibilityLayer
            >
              <CartesianGrid
                stroke="#26354B"
                vertical={false}
                strokeDasharray="3 5"
              />
              <XAxis
                dataKey="tick"
                type="number"
                domain={["dataMin", "dataMax"]}
                tick={{ fill: "#A8B8CE", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                minTickGap={45}
                tickFormatter={(v) => `${v}s`}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fill: "#A8B8CE", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={65}
                tickFormatter={(v) => Number(v).toFixed(digits)}
              />
              <Tooltip
                contentStyle={{
                  background: "#1A2940",
                  border: "1px solid #43516B",
                  borderRadius: 10,
                  color: "#EAF0F8",
                  fontSize: 12,
                }}
                labelFormatter={(v) => `Simulation t+${v}s`}
                formatter={(value, name) =>
                  Array.isArray(value)
                    ? [
                        `${Number(value[0]).toFixed(3)} – ${Number(value[1]).toFixed(3)} ${sensor.unit}`,
                        name,
                      ]
                    : [`${Number(value).toFixed(3)} ${sensor.unit}`, name]
                }
              />
              <Area
                dataKey="band"
                name="Calibration envelope"
                stroke="none"
                fill="#B39DFF"
                fillOpacity={0.1}
                isAnimationActive={false}
              />
              {data.segments
                .filter((s) => s.tick >= (points[0]?.tick ?? 0))
                .slice(-8)
                .map((segment, i) => (
                  <ReferenceLine
                    key={`${segment.tick}-${i}`}
                    x={segment.tick}
                    stroke="#F2B86B"
                    strokeOpacity={0.35}
                    strokeDasharray="3 5"
                  />
                ))}
              <Line
                name="Original"
                dataKey="truth"
                stroke="#56D9F5"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                name="Receiver / AI"
                dataKey="reconstructed"
                stroke="#B39DFF"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                name="Exact sample"
                dataKey="exact"
                stroke="none"
                dot={{
                  r: 3.5,
                  fill: "#0B1220",
                  stroke: "#56D9F5",
                  strokeWidth: 2,
                }}
                isAnimationActive={false}
              />
              {visibleRows
                .filter((row) => row.events.length)
                .slice(-4)
                .map((row) => (
                  <ReferenceLine
                    key={`event-${row.tick}`}
                    x={row.tick}
                    stroke="#FF7B88"
                    strokeDasharray="3 4"
                    label={{
                      value: row.events.some((e) => e.endsWith("cleared"))
                        ? "Cleared"
                        : "Event",
                      fill: "#FF7B88",
                      fontSize: 10,
                      position: "insideTopRight",
                    }}
                  />
                ))}
              {visibleRows
                .filter(
                  (row) =>
                    row.exact &&
                    row.tick > 8 &&
                    Math.abs(row.forecast[selected] - row.received[selected]) >
                      [0.15, 0.04, 0.04][selected],
                )
                .map((row) => (
                  <ReferenceDot
                    key={`correction-${row.tick}`}
                    x={row.tick}
                    y={row.received[selected]}
                    r={6}
                    fill="transparent"
                    stroke="#F2B86B"
                    strokeWidth={1.5}
                  />
                ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className={styles.emptyChart}>
          <svg viewBox="0 0 180 40" aria-hidden="true">
            <path
              d="M0 23h35l8-9 11 17 12-22 12 14h34l8-7 8 11 9-10h43"
              stroke="#56D9F5"
              strokeOpacity=".3"
              fill="none"
              strokeWidth="2"
            />
          </svg>
          <p>Your first readings will appear here.</p>
          <span>
            Start the experiment. Then change a control to see the trade-off.
          </span>
        </div>
      )}
      <div className={styles.chartFooter}>
        <span>{sensor.unit} · solid = truth, dashed = receiver</span>
        <button onClick={() => setTable(!table)} aria-expanded={table}>
          {table ? "Hide" : "Show"} exact readings
        </button>
      </div>
      {table && (
        <div className={styles.dataTable}>
          <table>
            <caption>
              Last 10 {sensor.name.toLowerCase()} readings ({sensor.unit})
            </caption>
            <thead>
              <tr>
                <th>Time</th>
                <th>Original</th>
                <th>Receiver</th>
                <th>Source</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {data.series
                .slice(-10)
                .reverse()
                .map((row) => (
                  <tr key={row.tick}>
                    <td>{row.tick}s</td>
                    <td>{row.truth[selected].toFixed(3)}</td>
                    <td>{row.received[selected].toFixed(3)}</td>
                    <td>{row.exact ? "Received" : "Estimated"}</td>
                    <td>{row.error[selected].toFixed(3)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
