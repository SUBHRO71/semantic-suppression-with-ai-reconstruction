import { useCallback, useEffect, useRef, useState } from 'react';
import type { Settings, Snapshot } from './types';

export function useLab() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [pageVisible, setPageVisible] = useState(!document.hidden);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    let disposed = false;
    let socket: WebSocket;
    let retry: ReturnType<typeof setTimeout>;
    let pending: Snapshot | null = null;
    const visibility = () => {
      setPageVisible(!document.hidden);
      if (!document.hidden && pending) { setData(pending); pending = null; }
    };
    document.addEventListener('visibilitychange', visibility);
    const connect = () => {
      socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/dashboard`);
      socket.onopen = () => { setConnected(true); setError(''); };
      socket.onmessage = event => {
        try { const snapshot = JSON.parse(event.data); if (document.hidden) pending = snapshot; else setData(snapshot); } catch { setError('The live feed could not be read. Reconnect to retry.'); }
      };
      socket.onclose = () => {
        setConnected(false);
        if (!disposed) retry = setTimeout(connect, 1200);
      };
      socket.onerror = () => setError('Live connection interrupted. Reconnecting automatically…');
    };
    connect();
    return () => { disposed = true; clearTimeout(retry); socket.close(); document.removeEventListener('visibilitychange', visibility); if (timer.current) clearTimeout(timer.current); };
  }, []);

  const command = useCallback(async (action = 'configure', settings: Partial<Settings> = {}, preset?: string) => {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/control', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, settings, ...(preset ? { preset } : {}) }),
      });
      if (!response.ok) {
        const message = await response.json();
        throw new Error(typeof message.detail === 'string' ? message.detail : 'Setting was rejected. Check the value and retry.');
      }
      setNotice(action === 'configure' ? 'Applied by the next sample' : `${action.charAt(0).toUpperCase() + action.slice(1)} requested`);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setNotice(''), 2600);
    } catch (e) { setError(e instanceof Error ? e.message : 'Request failed. Try again.'); }
    finally { setBusy(false); }
  }, []);
  return { data, connected, error, busy, notice, command, pageVisible };
}
