import {
  Flame,
  Shuffle,
  Gauge,
  Zap,
  SlidersHorizontal,
  Activity,
  Timer,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Settings } from "./types";
import styles from "./styles.module.css";

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      onClick={() => onChange(!value)}
      className={`${styles.toggle} ${value ? styles.toggleOn : ""}`}
    >
      <span />
    </button>
  );
}
function Slider({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  display,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  display: string;
  onChange: (v: number) => void;
  hint?: string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const id = label.toLowerCase().replace(/\W/g, "-");
  return (
    <div className={styles.sliderBlock}>
      <label htmlFor={id}>
        <span>{label}</span>
        <output className={styles.mono}>
          {draft === value
            ? display
            : max === 1
              ? `${Math.round(draft * 100)}%`
              : `${draft}`}
        </output>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={draft}
        style={
          {
            "--fill": `${((draft - min) / (max - min)) * 100}%`,
          } as React.CSSProperties
        }
        onChange={(e) => setDraft(Number(e.target.value))}
        onPointerUp={() => onChange(draft)}
        onKeyUp={() => onChange(draft)}
        onBlur={() => {
          if (draft !== value) onChange(draft);
        }}
      />
      {hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}

export function Controls({
  config,
  update,
  disabled,
}: {
  config: Settings;
  update: (settings: Partial<Settings>) => void;
  disabled: boolean;
}) {
  return (
    <aside className={styles.controls} aria-labelledby="controls-title">
      <div className={styles.sectionHeading}>
        <h2 id="controls-title">Shape the signal</h2>
        <SlidersHorizontal size={18} />
      </div>
      <p className={styles.controlsIntro}>
        Change the machine. Watch the transmission adapt.
      </p>
      <fieldset disabled={disabled} className={styles.controlFields}>
        <div className={styles.controlGroup}>
          <div className={styles.controlTitle}>
            <Flame size={17} />
            <h3>Heating</h3>
            <Toggle
              label="Heating"
              value={config.heating}
              onChange={(heating) => update({ heating })}
            />
          </div>
          <Slider
            label="Heating rate"
            value={config.heating_rate}
            max={1.5}
            step={0.05}
            display={`${config.heating_rate.toFixed(2)} °C/tick`}
            onChange={(heating_rate) => update({ heating_rate })}
          />
        </div>
        <div className={styles.controlGroup}>
          <div className={styles.controlTitle}>
            <Shuffle size={17} />
            <h3>Signal regularity</h3>
          </div>
          <div
            className={styles.segmented}
            aria-label="Signal regularity presets"
          >
            <button
              aria-pressed={config.randomness < 0.3}
              onClick={() => update({ randomness: 0.05 })}
            >
              Smooth
            </button>
            <button
              aria-pressed={config.randomness >= 0.3}
              onClick={() => update({ randomness: 0.85 })}
            >
              Variable
            </button>
          </div>
          <Slider
            label="Randomness"
            value={config.randomness}
            display={`${Math.round(config.randomness * 100)}%`}
            onChange={(randomness) => update({ randomness })}
            hint="Less predictable signals need more exact updates."
          />
        </div>
        <div className={styles.controlGroup}>
          <div className={styles.controlTitle}>
            <Gauge size={17} />
            <h3>Machine load</h3>
          </div>
          <Slider
            label="Operating load"
            value={config.load}
            display={`${Math.round(config.load * 100)}%`}
            onChange={(load) => update({ load })}
          />
          <div className={styles.inlineControl}>
            <span>Cycling operation</span>
            <Toggle
              label="Cycling operation"
              value={config.cycling}
              onChange={(cycling) => update({ cycling })}
            />
          </div>
        </div>
        <div className={styles.controlGroup}>
          <div className={styles.controlTitle}>
            <Zap size={17} />
            <h3>Suppression</h3>
            <Toggle
              label="Suppression"
              value={config.suppression}
              onChange={(suppression) => update({ suppression })}
            />
          </div>
          <Slider
            label="Aggressiveness"
            value={config.aggressiveness}
            display={`${Math.round(config.aggressiveness * 100)}%`}
            onChange={(aggressiveness) => update({ aggressiveness })}
          />
          <div className={styles.scaleLabels}>
            <span>More exact updates</span>
            <span>More estimates</span>
          </div>
          <details className={styles.advanced}>
            <summary>
              <Timer size={14} />
              Refresh interval
            </summary>
            <Slider
              label="Heartbeat"
              min={2}
              max={30}
              step={1}
              value={config.heartbeat}
              display={`${config.heartbeat}s simulation`}
              onChange={(heartbeat) => update({ heartbeat })}
            />
            <p className={styles.hint}>
              Fault transitions always bypass suppression.
            </p>
          </details>
        </div>
        <div className={styles.controlGroup}>
          <div className={styles.controlTitle}>
            <Activity size={17} />
            <h3>Introduce a fault</h3>
          </div>
          <div className={styles.faultButtons}>
            <button
              className={config.overheat ? styles.faultActive : ""}
              aria-pressed={config.overheat}
              onClick={() => update({ overheat: !config.overheat })}
            >
              <Flame size={15} />
              {config.overheat ? "Clear heat fault" : "Overheat"}
            </button>
            <button
              className={config.vibration_fault ? styles.faultActive : ""}
              aria-pressed={config.vibration_fault}
              onClick={() =>
                update({ vibration_fault: !config.vibration_fault })
              }
            >
              <Activity size={15} />
              {config.vibration_fault ? "Clear vibration" : "Vibration spike"}
            </button>
          </div>
        </div>
      </fieldset>
    </aside>
  );
}
