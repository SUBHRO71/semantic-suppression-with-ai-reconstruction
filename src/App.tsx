import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { Activity, ArrowDownToLine, ArrowRight, BookOpen, Check, CircleHelp, Cpu, Pause, Play, RotateCcw, Waves, X } from 'lucide-react';
import { useLab } from './useLab';
import { Pipeline } from './Pipeline';
import { SignalChart } from './SignalChart';
import { Controls } from './Controls';
import { Outcomes } from './Outcomes';
import type { Report, Settings } from './types';
import styles from './styles.module.css';

const stateLabels: Record<string,string> = { ready: 'Ready to explore', warming_up: 'Warming up', running: 'Live experiment', paused: 'Paused', failed: 'Needs attention', disconnected: 'Disconnected' };
export default function App() {
  const { data, connected, error, busy, notice, command, pageVisible } = useLab();
  const systemReduced = useReducedMotion();
  const [motionEnabled, setMotionEnabled] = useState(true);
  const reduced = !motionEnabled || !!systemReduced || !pageVisible;
  const [scenario, setScenario] = useState('steady');
  const [help, setHelp] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [guided, setGuided] = useState(false);
  const guideStage = useRef(-1);
  const guideStart = useRef(0);
  const active = data && ['running', 'warming_up'].includes(data.state);
  const available = !!(connected && data?.sender_connected && data?.channel_connected && !data.failure);
  const update = (settings: Partial<Settings>) => { setScenario('custom'); setGuided(false); void command('configure', settings); };

  useEffect(() => {
    if (!data) return;
    const c = data.config;
    const steady = !c.heating && !c.cycling && !c.overheat && !c.vibration_fault && c.randomness === .05 && c.load === .55 && c.suppression && c.aggressiveness === .6;
    const heat = c.heating && !c.cycling && !c.overheat && !c.vibration_fault && c.randomness === .05 && c.load === .7 && c.heating_rate === .65 && c.suppression && c.aggressiveness === .6;
    const variable = !c.heating && c.cycling && !c.overheat && !c.vibration_fault && c.randomness === .85 && c.load === .72 && c.suppression && c.aggressiveness === .6;
    setScenario(steady ? 'steady' : heat ? 'heat' : variable ? 'variable' : 'custom');
  }, [data?.config]);

  useEffect(() => {
    if (!guided || !data || !active) return;
    const tick = data.metrics.ticks - guideStart.current;
    const stage = tick >= 80 ? 4 : tick >= 60 ? 3 : tick >= 40 ? 2 : tick >= 20 ? 1 : 0;
    if (stage === guideStage.current) return;
    guideStage.current = stage;
    if (stage === 1) void command('configure', { aggressiveness: .95 });
    if (stage === 2) void command('configure', { randomness: .9, cycling: true });
    if (stage === 3) void command('configure', { vibration_fault: true, heating: true });
    if (stage === 4) { void command('configure', { vibration_fault: false, randomness: .05, cycling: false, heating: false, aggressiveness: .6 }); setGuided(false); }
  }, [guided, data, active, command]);

  async function startGuide() {
    guideStart.current = data?.metrics.ticks ?? 0;
    guideStage.current = -1;
    setScenario('steady');
    await command('configure', { speed: 2 }, 'steady');
    if (!active) await command(data?.state === 'paused' ? 'resume' : 'start');
    setGuided(true);
  }

  if (!data) return <main className={styles.loading}><Waves size={34}/><h1>Preparing Signal Loom</h1><p>{error || 'Connecting to your local experiment…'}</p><span>Run npm start if the local server is not running.</span></main>;
  const latest = data.series.at(-1);
  return <div className={styles.app}>
    <a className={styles.skipLink} href="#experiment">Skip to experiment</a>
    <header className={styles.header}>
      <a href="/" className={styles.brand}><Waves size={29}/><span>signal<span className={styles.brandLight}>loom</span></span></a>
      <div className={styles.headerDescription}>Semantic suppression <ArrowRight size={14}/> AI reconstruction</div>
      <div className={styles.headerRight}><span className={styles.localBadge}><Cpu size={14}/>All local</span><button className={styles.iconButton} aria-label="How this experiment works" aria-expanded={help} onClick={() => setHelp(!help)}><CircleHelp size={20}/></button></div>
    </header>
    <main id="experiment" className={styles.main}>
      <div className={styles.intro}>
        <div><h1>Send meaning. <span>Reconstruct the rest.</span></h1><p>A live look at how less data becomes a complete signal.</p></div>
        <button className={styles.demoButton} disabled={!available || busy} onClick={() => guided ? setGuided(false) : void startGuide()}><BookOpen size={16}/>{guided ? 'End guided demo' : 'Take the guided demo'}<ArrowRight size={15}/></button>
      </div>
      {help && <section className={styles.explainer}>
        <div><h2>A real experiment, in four steps</h2><button aria-label="Close explanation" className={styles.iconButton} onClick={() => setHelp(false)}><X size={18}/></button></div>
        <p>The sender sees the original sensor values. It transmits changes that matter or exceed prediction tolerances. The receiver uses only received frames, its history, and a shared local model to estimate missing readings. The observation feed lets you compare those estimates with truth; it never supplies truth to receiver inference.</p>
        <p>Heating and signal regularity change predictability. Higher suppression tolerances usually save more traffic while allowing more error. Fault transitions bypass suppression. All values and limits represent a simulated machine.</p>
      </section>}
      <div className={styles.runBar}>
        <div className={styles.runStatus}><span className={`${styles.statusDot} ${active && connected ? styles.statusLive : ''}`}/><strong>{connected ? stateLabels[data.state] ?? data.state : 'Reconnecting…'}</strong><span className={styles.runTime}>t+{data.metrics.ticks.toString().padStart(3, '0')}s</span></div>
        <div className={styles.runSettings}>
          <label className={styles.selectLabel}><span className={styles.srOnly}>Scenario</span><select aria-label="Scenario" value={scenario} disabled={!available} onChange={e => { setScenario(e.target.value); setGuided(false); void command('configure', {}, e.target.value); }}><option value="steady">Steady operation</option><option value="heat">Rising heat</option><option value="variable">Unpredictable load</option>{scenario === 'custom' && <option value="custom">Custom experiment</option>}</select></label>
          <div className={styles.speedControl} aria-label="Simulation speed">{[1,2,5].map(speed => <button key={speed} disabled={!available} aria-pressed={data.config.speed === speed} onClick={() => update({ speed })}>{speed}×</button>)}</div>
        </div>
        <div className={styles.runActions}>
          <button className={styles.iconButton} disabled={!available || busy} aria-label="Reset experiment" onClick={() => { setGuided(false); void command('reset'); }} title="Reset experiment"><RotateCcw size={17}/></button>
          <button className={styles.primaryButton} disabled={!available || busy} onClick={() => void command(active ? 'pause' : data.state === 'paused' ? 'resume' : 'start')}>{active ? <Pause size={16}/> : <Play size={16}/>} {active ? 'Pause' : data.state === 'paused' ? 'Resume' : 'Start experiment'}</button>
        </div>
      </div>
      <div className={styles.feedback} role="status" aria-live="polite">{error || data.failure ? <span className={styles.coral}>{error || data.failure}</span> : notice ? <><Check size={13}/>{notice}</> : guided ? `Guided demo · ${['steady operation', 'increased suppression', 'added randomness', 'fault and heating', 'recovery'][Math.max(0, guideStage.current)]}` : <span>Interact with the controls to change the flow in real time.</span>}</div>
      <div className={styles.labLayout}>
        <div className={styles.visuals}><Pipeline data={data} reduced={reduced}/><SignalChart data={data}/></div>
        <Controls config={data.config} update={update} disabled={!available}/>
      </div>
      <Outcomes data={data} reduced={reduced}/>
      <section className={styles.evidence}>
        <div className={styles.logArea}><div className={styles.sectionHeading}><h2>Decisions, explained</h2><span className={styles.smallMuted}>Latest 5 frames</span></div>
          <div className={styles.logList}>{data.logs.length ? data.logs.slice(0,5).map(log => <div key={log.tick} className={styles.logRow}><time className={styles.mono}>+{log.tick}s</time><span className={`${styles.logBadge} ${log.sent ? log.events.length ? styles.eventBadge : styles.sentBadge : styles.suppressedBadge}`}>{log.sent ? log.events.length ? 'Event sent' : 'Sent' : 'Suppressed'}</span><p>{log.detail}</p></div>) : <p className={styles.logEmpty}>Start a run to inspect each decision and its reason.</p>}</div>
        </div>
        <div className={styles.receiverDetails}><div className={styles.sectionHeading}><h2>Inside the receiver</h2><Cpu size={17}/></div><dl><div><dt>Inference</dt><dd>Local gradient boosting</dd></div><div><dt>Last exact sample</dt><dd>{latest ? `${latest.age}s ago` : 'Waiting'}</dd></div><div><dt>Model bootstrap</dt><dd>{(data.model.bootstrap_bytes / 1024).toFixed(0)} KB · separate cost</dd></div><div><dt>Training evidence</dt><dd><button onClick={async () => { if (report) { setReport(null); return; } try { const response = await fetch('/api/report'); if (response.ok) setReport(await response.json()); } catch { /* live experiment remains available */ } }} aria-expanded={!!report}>{report ? 'Hide benchmark' : 'View benchmark'}<ArrowRight size={12}/></button></dd></div></dl><p>Calibrated error envelope uses held-out estimated readings; it is not a guarantee.</p></div>
      </section>
      {report && <section className={styles.benchmark}><h2>Held-out model comparison</h2><p>Separate seeds · 240 ticks per run · same policy, each model's own history. A simple baseline can outperform AI on steady signals.</p><div className={styles.dataTable}><table><thead><tr><th>Scenario</th><th>Model</th><th>Frames saved</th><th>Normalized MAE</th></tr></thead><tbody>{Object.entries(report.results).flatMap(([scenario,models]) => Object.entries(models).map(([model,result]) => <tr key={`${scenario}-${model}`}><td>{scenario}</td><td>{model === 'ai' ? 'Gradient boosting' : model === 'hold' ? 'Hold last value' : 'Linear extrapolation'}</td><td>{(result.frame_savings * 100).toFixed(1)}%</td><td>{result.normalized_mae.toFixed(5)}</td></tr>))}</tbody></table></div></section>}
      <footer className={styles.footer}><div><Activity size={14}/><span>Simulated machine. Measured outcomes.</span><span className={styles.footerDivider}/><span>Simulation time · {data.config.speed}×</span></div><div><label className={styles.motionSetting}><input type="checkbox" checked={motionEnabled && !systemReduced} disabled={!!systemReduced} onChange={e => setMotionEnabled(e.target.checked)}/>Motion</label><a href="/api/export/csv" download><ArrowDownToLine size={14}/>CSV</a><a href="/api/export/json" download><ArrowDownToLine size={14}/>Run report</a></div></footer>
    </main>
  </div>;
}
