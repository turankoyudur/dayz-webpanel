import React from 'react';
import { useAuth } from './auth';
import { useInstanceSocket } from './useInstanceSocket';

export default function ConsoleView({ instanceId }: { instanceId: string }): JSX.Element {
  const { apiFetch } = useAuth();
  const socket = useInstanceSocket(instanceId);

  const [lines, setLines] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const loadTail = React.useCallback(async () => {
    setError(null);
    try {
      const url = `/api/instances/${instanceId}/logs/tail?rootKey=root&path=${encodeURIComponent('__panel__/console.log')}&lines=200`;
      const res = await apiFetch(url);
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { lines: string[] };
      setLines(data.lines || []);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load console log');
    }
  }, [apiFetch, instanceId]);

  React.useEffect(() => {
    void loadTail();
  }, [loadTail]);

  React.useEffect(() => {
    if (!socket) return;
    const onLine = (evt: any) => {
      const line = evt?.line ?? String(evt);
      setLines((prev) => [...prev, line].slice(-300));
    };
    socket.on('consoleLine', onLine);
    return () => {
      socket.off('consoleLine', onLine);
    };
  }, [socket]);

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Console</h3>
        <button className="btn" onClick={() => void loadTail()}>
          Reload tail
        </button>
      </div>

      {error ? (
        <div style={{ marginTop: 10, background: '#3a1a1a', border: '1px solid #6a2a2a', padding: 10, borderRadius: 10 }}>
          <span className="mono">{error}</span>
        </div>
      ) : null}

      <div
        className="mono"
        style={{ marginTop: 12, height: 420, overflow: 'auto', background: '#0b0f14', border: '1px solid #213044', borderRadius: 10, padding: 10 }}
      >
        {lines.map((l, idx) => (
          <div key={idx}>{l}</div>
        ))}
      </div>
    </div>
  );
}
