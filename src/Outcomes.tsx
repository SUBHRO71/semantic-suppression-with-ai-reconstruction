import { useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { ArrowDownRight, CheckCheck, Radio, Target } from 'lucide-react';
import type { Snapshot } from './types';
import styles from './styles.module.css';

export function AnimatedNumber({ value, digits = 0, suffix = '', reduced }: { value: number | null; digits?: number; suffix?: string; reduced: boolean }) {
  const raw = useMotionValue(value ?? 0);
  const spring = useSpring(raw, { stiffness: 180, damping: 30 });
  const text = useTransform(reduced ? raw : spring, n => `${n.toFixed(digits)}${suffix}`);
  useEffect(() => { raw.set(value ?? 0); }, [value, raw]);
  return value === null ? <span>—</span> : <motion.span>{text}</motion.span>;
}
const bytes = (value: number) => value >= 1024 ? `${(value / 1024).toFixed(1)} KB` : `${value} B`;

export function Outcomes({ data, reduced }: { data: Snapshot; reduced: boolean }) {
  const m = data.metrics;
  const max = Math.max(m.baseline_bytes, m.actual_bytes, 1);
  const recent = data.series.slice(-40);
  return <section className={styles.outcomes} aria-label="Measured experiment outcomes">
    <div className={styles.trafficOutcome}>
      <div className={styles.outcomeLabel}><ArrowDownRight size={16}/><h2>Less on the wire</h2><span>Whole run</span></div>
      <div className={styles.outcomeValue}><AnimatedNumber value={m.byte_savings === null ? null : m.byte_savings * 100} digits={1} suffix="%" reduced={reduced}/><small>payload saved</small></div>
      <div className={styles.trafficRow}><span>Full stream</span><div><i style={{ transform: `scaleX(${m.baseline_bytes / max})` }}/></div><strong>{bytes(m.baseline_bytes)}</strong></div>
      <div className={`${styles.trafficRow} ${styles.actualTraffic}`}><span>Actual</span><div><i style={{ transform: `scaleX(${m.actual_bytes / max})` }}/></div><strong>{bytes(m.actual_bytes)}</strong></div>
      <p>Includes channel control payload · excludes network headers</p>
    </div>
    <div className={styles.estimateOutcome}>
      <div className={styles.outcomeLabel}><Radio size={16}/><h2>AI bridges the gaps</h2></div>
      <div className={styles.outcomeValue}><AnimatedNumber value={m.frame_savings === null ? null : m.frame_savings * 100} digits={1} suffix="%" reduced={reduced}/><small>frames suppressed</small></div>
      <div className={styles.sampleStrip} aria-label="Last 40 readings, cyan received and violet estimated">{recent.length ? recent.map(r => <i key={r.tick} className={r.exact ? styles.exactStrip : styles.estimatedStrip} title={`t+${r.tick}s · ${r.exact ? 'received' : 'estimated'}`}/>) : Array.from({length: 40},(_,i) => <i key={i} className={styles.emptyStrip}/>)}</div>
      <p><span className={styles.cyan}>{m.sent} received</span><span className={styles.violet}>{m.suppressed} estimated</span></p>
    </div>
    <div className={styles.accuracyOutcome}>
      <div className={styles.outcomeLabel}><Target size={16}/><h2>Reconstruction error</h2></div>
      <div className={styles.errorRows}>{['Temperature', 'Vibration', 'Power'].map((name,i) => <div key={name}><span>{name}</span><strong>{m.ticks ? m.mae[i].toFixed(3) : '—'}<small> {['°C','mm/s','kW'][i]}</small></strong><div className={styles.errorTrack}><i style={{ transform: `scaleX(${Math.min(1, m.mae[i] / [3,.7,.55][i])})` }}/></div></div>)}</div>
      <p>Mean absolute error · bars use fixed demo scales</p>
    </div>
    <div className={styles.eventOutcome}>
      <div className={styles.outcomeLabel}><CheckCheck size={16}/><h2>Meaning preserved</h2></div>
      <div className={styles.outcomeValue}><span>{m.events_delivered}<em> / {m.events_expected}</em></span><small>events delivered</small></div>
      <div className={styles.eventJourney}><span>Detected</span><i/><span>Received</span></div>
      <p>{m.event_delay_ms === null ? 'Introduce a fault to measure delivery.' : `${m.event_delay_ms.toFixed(1)} ms mean local transport delay`}</p>
    </div>
  </section>;
}
