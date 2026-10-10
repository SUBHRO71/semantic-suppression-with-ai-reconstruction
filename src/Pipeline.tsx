import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, Minus } from 'lucide-react';
import type { Snapshot } from './types';
import styles from './styles.module.css';

export function Pipeline({ data, reduced }: { data: Snapshot; reduced: boolean }) {
  const latest = data.series.at(-1);
  const active = ['running', 'warming_up'].includes(data.state);
  const hot = data.faults.hot;
  const temp = latest?.truth[0] ?? 55.2;
  const thermal = Math.max(0, Math.min(1, (temp - 25) / 85));
  const packets = active && !reduced ? data.series.slice(-3) : [];
  return <section className={styles.pipeline} aria-labelledby="pipeline-title">
    <div className={styles.sectionHeading}>
      <h2 id="pipeline-title">The live journey</h2>
      <span className={styles.tag}><span className={styles.localDot} /> Local channel</span>
    </div>
    <div className={styles.stageLabels}>
      <div><span className={styles.stageIndex}>01</span><strong>Sense</strong><small>Original machine signal</small></div>
      <div><span className={styles.stageIndex}>02</span><strong>Decide</strong><small>Meaning over repetition</small></div>
      <div><span className={styles.stageIndex}>03</span><strong>Transmit</strong><small>Only the essential frames</small></div>
      <div><span className={styles.stageIndex}>04</span><strong>Reconstruct</strong><small>AI fills the missing signal</small></div>
    </div>
    <div className={styles.pipelineDiagram}>
      <svg viewBox="0 0 1000 250" role="img" aria-label={`Machine to suppression gate to receiver. ${data.metrics.sent} frames sent and ${data.metrics.suppressed} suppressed.`}>
        <defs>
          <linearGradient id="machineFill" x1="0" x2="1"><stop stopColor="#1A2940"/><stop offset="1" stopColor="#142337"/></linearGradient>
          <linearGradient id="thermalFill" x1="0" y1="1" x2="0" y2="0"><stop stopColor="#56D9F5"/><stop offset=".6" stopColor="#F2B86B"/><stop offset="1" stopColor="#FF7B88"/></linearGradient>
          <linearGradient id="channelFill"><stop stopColor="#56D9F5" stopOpacity=".12"/><stop offset="1" stopColor="#B39DFF" stopOpacity=".06"/></linearGradient>
        </defs>
        <rect x="34" y="38" width="196" height="145" rx="14" fill="url(#machineFill)" stroke="#33445E"/>
        <path d="M50 183v12h164v-12 M68 195v10m127-10v10" stroke="#455876" strokeWidth="5" fill="none"/>
        <path d="M53 55h41m81 0h38" stroke="#536785" strokeWidth="2"/>
        <circle cx="120" cy="112" r="52" fill="#0B1626" stroke={hot ? '#FF7B88' : '#3A536F'} strokeWidth="2"/>
        <circle cx="120" cy="112" r="41" fill="none" stroke="#233A51" strokeDasharray="3 5"/>
        <g className={styles.rotor} style={{ animationDuration: `${3 - data.config.load * 2}s`, animationPlayState: active && !reduced ? 'running' : 'paused' }}>
          {[0, 60, 120, 180, 240, 300].map(angle => <path key={angle} d="M122 102C149 86 154 103 148 120L132 115Z" transform={`rotate(${angle} 120 112)`} fill="#56D9F5" fillOpacity=".7"/>) }
        </g>
        <circle cx="120" cy="112" r="12" fill="#182F45" stroke="#7CE5FA" strokeWidth="2"/>
        <circle cx="120" cy="112" r="4" fill="#C1F3FC"/>
        <rect x="195" y="73" width="10" height="82" rx="5" fill="#0B1626"/>
        <rect x="195" y={155 - thermal * 82} width="10" height={thermal * 82} rx="5" fill="url(#thermalFill)"/>
        <path d="M48 171h12l5-8 7 12 7-10 5 6h19" stroke={data.faults.vibration ? '#FF7B88' : '#56D9F5'} fill="none" strokeWidth="1.5"/>
        <text x="162" y="174" fill="#A8B8CE" fontSize="10" fontFamily="IBM Plex Mono">M—01</text>
        <path d="M230 112h101" stroke="#3B566F" strokeWidth="2"/>
        <path d="m291 108 5 4-5 4" fill="none" stroke="#7593AA"/>
        <rect x="331" y="70" width="72" height="86" rx="12" fill="#182A3D" stroke={latest?.exact ? '#56D9F5' : '#F2B86B'} strokeWidth="1.5"/>
        {[89, 104, 119, 134].map(y => <path key={y} d={`M351 ${y}h32`} stroke={latest?.exact ? '#56D9F5' : '#F2B86B'} strokeWidth="3" strokeLinecap="round"/>) }
        <path d="M403 112h346" stroke="#31516C" strokeWidth="2"/>
        <rect x="465" y="96" width="212" height="32" rx="16" fill="url(#channelFill)"/>
        <path d="m705 108 5 4-5 4" fill="none" stroke="#7593AA"/>
        <path d="M367 156v35q0 20 20 20h205" stroke="#F2B86B" strokeOpacity=".48" fill="none" strokeDasharray="5 6"/>
        <circle cx="600" cy="211" r="4" fill="#F2B86B"/>
        <text x="418" y="232" fill="#F2B86B" fontSize="12" fontFamily="Manrope">Predictable frames stay here</text>
        <rect x="749" y="40" width="210" height="143" rx="14" fill="#1C223B" stroke="#514C77"/>
        <g stroke="#8976C0" fill="none" strokeWidth="1.5">
          <path d="M779 110h25m0 0 25-27m-25 27 25 27m0-54 30-16m-30 16 30 16m-30 38 30-16m-30 16 30 16"/>
        </g>
        {[[779,110],[804,110],[829,83],[829,137],[859,67],[859,99],[859,121],[859,153]].map(([x,y],i) => <circle key={i} cx={x} cy={y} r={i < 4 ? 5 : 4} fill={i > 3 ? '#B39DFF' : '#313252'} stroke="#B39DFF"/>) }
        <path d="M883 108h12l5-18 10 32 8-20 7 8h16" fill="none" stroke="#D0C2FF" strokeWidth="2"/>
        <text x="891" y="154" fill="#B39DFF" fontFamily="IBM Plex Mono" fontSize="10">LOCAL AI</text>
        <AnimatePresence>
          {packets.map(row => <motion.g key={`${data.run}-${row.tick}`} initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 1.05 }}>
            <motion.circle r="5" fill={row.exact ? (row.events.length ? '#FF7B88' : '#56D9F5') : '#F2B86B'}
              initial={{ cx: 240, cy: 112 }} animate={row.exact ? { cx: [240, 367, 749], cy: [112, 112, 112] } : { cx: [240, 367, 367, 590], cy: [112, 112, 211, 211] }}
              transition={{ duration: 1, times: row.exact ? [0,.3,1] : [0,.3,.5,1], ease: 'easeInOut' }} />
          </motion.g>)}
        </AnimatePresence>
      </svg>
    </div>
    <div className={styles.stageReadouts}>
      <div><span className={styles.number}>{latest ? latest.truth[0].toFixed(1) : '—'}<small> °C</small></span><span>Machine temperature</span></div>
      <div><span className={`${styles.number} ${styles.amber}`}>{data.metrics.suppressed}<small> frames</small></span><span>Suppressed locally</span></div>
      <div><span className={`${styles.number} ${styles.cyan}`}>{data.metrics.sent}<small> frames</small></span><span>Actually transmitted</span></div>
      <div><span className={`${styles.number} ${styles.violet}`}>{latest ? latest.received[0].toFixed(1) : '—'}<small> °C</small></span><span>{latest?.exact ? 'Exact measurement received' : latest ? 'AI estimated · temperature' : 'Waiting for first sample'}</span></div>
    </div>
    <div className={styles.decisionLine}>
      <span className={`${styles.decisionIcon} ${latest?.exact ? styles.cyan : styles.amber}`}>{latest?.exact ? <ArrowUpRight size={16}/> : <Minus size={16}/>}</span>
      <p>{latest?.detail ?? 'Start the experiment to watch meaningful frames move through the channel.'}</p>
      <span className={styles.mono}>{latest ? `t+${latest.tick}s` : 'Ready'}</span>
    </div>
  </section>;
}
