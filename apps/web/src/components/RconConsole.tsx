import React from 'react';
import { useAuth } from './auth';
import { useInstanceSocket } from './useInstanceSocket';

type RconState = {
  connected: boolean;
  lastError?: string;
  host?: string;
  port?: number;
};

export default function RconConsole({ instanceId }: { instanceId: string }): JSX.Element {
  const { apiFetch } = useAuth();
  const socket = useInstanceSocket(instanceId);

  const [state, setState] = React.useState<RconState>({ connected: false });
  const [cmd, setCmd] = React.useState<string>('players');
  const [output, setOutput] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadState = React.useCallback(async () => {
    const res = await apiFetch(`/api/instances/${instanceId}/rcon/state`);
    if (res.ok) {
      const data = (await res.json()) as { state: RconState };
      setState(data.state);
    }
  }, [apiFetch, instanceId]);

  React.useEffect(() => {
    void loadState();
  }, [loadState]);

  React.useEffect(() => {
    if (!socket) return;
    const onMsg = (evt: any) => {
      setOutput((prev) => {
        const next = [...prev, evt?.message ?? String(evt)];
        return next.slice(-300);
      });
    };
    socket.on('rconMessage', onMsg);
    socket.on('rconConnected', () => {
      void loadState();
      setOutput((p) => [...p, '[connected]'].slice(-300));
    });
    socket.on('rconDisconnected', () => {
      void loadState();
      setOutput((p) => [...p, '[disconnected]'].slice(-300));
    });
    socket.on('rconError', (e: any) => {
      setOutput((p) => [...p, `[error] ${e?.error ?? e}`].slice(-300));
    });

    return () => {
      socket.off('rconMessage', onMsg);
    };
  }, [socket, loadState]);

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/instances/${instanceId}/rcon/connect`, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { state: RconState };
      setState(data.state);
    } catch (err: any) {
      setError(err?.message ?? 'Connect failed');
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/instances/${instanceId}/rcon/disconnect`, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      setState({ connected: false });
    } catch (err: any) {
      setError(err?.message ?? 'Disconnect failed');
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (!cmd.trim()) return;
    setBusy(true);
    setError(null);
    try {
      setOutput((p) => [...p, `>> ${cmd}`].slice(-300));
      const res = await apiFetch(`/api/instances/${instanceId}/rcon/command`, {
        method: 'POST',
        body: JSON.stringify({ command: cmd })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { response: string };
      setOutput((p) => [...p, `<< ${data.response}`].slice(-300));
      void loadState();
    } catch (err: any) {
      setError(err?.message ?? 'Command failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="row" style={{ alignItems: 'stretch' }}>
      <div className="card" style={{ flex: 1 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0 }}>RCON</h3>
            <div className="mono" style={{ opacity: 0.85 }}>
              {state.connected ? `connected (${state.host}:${state.port})` : 'disconnected'}
            </div>
          </div>
          <div className="row">
            {state.connected ? (
              <button className="btn" onClick={() => void disconnect()} disabled={busy}>
                Disconnect
              </button>
            ) : (
              <button className="btn primary" onClick={() => void connect()} disabled={busy}>
                Connect
              </button>
            )}
          </div>
        </div>

        {state.lastError ? (
          <div style={{ marginTop: 10, opacity: 0.85 }}>
            <div className="label">Last error</div>
            <div className="mono">{state.lastError}</div>
          </div>
        ) : null}

        {error ? (
          <div style={{ marginTop: 10, background: '#3a1a1a', border: '1px solid #6a2a2a', padding: 10, borderRadius: 10 }}>
            <span className="mono">{error}</span>
          </div>
        ) : null}

        <div style={{ marginTop: 12 }}>
          <div className="label">Command</div>
          <div className="row">
            <input className="input mono" value={cmd} onChange={(e) => setCmd(e.target.value)} />
            <button className="btn primary" onClick={() => void send()} disabled={busy}>
              Send
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div className="label">Output</div>
          <div className="mono" style={{ height: 320, overflow: 'auto', background: '#0b0f14', border: '1px solid #213044', borderRadius: 10, padding: 10 }}>
            {output.map((l, idx) => (
              <div key={idx}>{l}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
