export type Settings = {
  load: number;
  heating: boolean;
  heating_rate: number;
  randomness: number;
  cycling: boolean;
  overheat: boolean;
  vibration_fault: boolean;
  suppression: boolean;
  aggressiveness: number;
  heartbeat: number;
  speed: number;
};
export type Sample = {
  tick: number;
  truth: number[];
  received: number[];
  forecast: number[];
  exact: boolean;
  age: number;
  error: number[];
  reason: string;
  detail: string;
  events: string[];
  config: Settings;
  baseline_bytes: number;
  payload_bytes: number;
  delay_ms: number | null;
};
export type Snapshot = {
  run: string;
  state: string;
  config: Settings;
  series: Sample[];
  logs: {
    tick: number;
    sent: boolean;
    reason: string;
    detail: string;
    events: string[];
  }[];
  segments: { tick: number; action: string; config: Settings; at: number }[];
  failure: string | null;
  channel_connected: boolean;
  sender_connected: boolean;
  faults: { hot: boolean; vibration: boolean };
  model: {
    version: string;
    digest: string;
    bootstrap_bytes: number;
    envelope: number[] | null;
  };
  metrics: {
    ticks: number;
    sent: number;
    suppressed: number;
    frame_savings: number | null;
    byte_savings: number | null;
    baseline_bytes: number;
    actual_bytes: number;
    measurement_bytes: number;
    control_bytes: number;
    mae: number[];
    normalized_mae: number;
    events_expected: number;
    events_delivered: number;
    event_delay_ms: number | null;
    recent_frame_savings: number | null;
    recent_mae: number[];
  };
};
export type Report = {
  results: Record<
    string,
    Record<
      string,
      { frame_savings: number; normalized_mae: number; mae: number[] }
    >
  >;
};
