import React from 'react';
import { useAuth } from './auth';
import { useInstanceSocket } from './useInstanceSocket';

export default function SteamCmdPanel({ instanceId }: { instanceId: string }): JSX.Element {
  const { apiFetch } = useAuth();
  const socket = useInstanceSocket(instanceId);

  const [output, setOutput] = React.useState<string[]>([]);
  const [running, setRunning] = React.useState<boolean>(false);
  const [workshopId, setWorkshopId] = React.useState<string>('');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!socket) return;
    const onLine = (evt: any) => {
      const line = evt?.line ?? String(evt);
      setOutput((prev) => [...prev, line].slice(-400));
    };
    socket.on('steamcmdOutput', onLine);
    return () => {
      socket.off('steamcmdOutput', onLine);
    };
  }, [socket]);

  const updateServer = async () => {
    setRunning(true);
    setError(null);
    setOutput([]);
    try {
      const res = await apiFetch(`/api/instances/${instanceId}/steamcmd/update`, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setOutput((prev) => [...prev, `Done. exitCode=${data?.result?.code}`]);
    } catch (err: any) {
      setError(err?.message ?? 'Update failed');
    } finally {
      setRunning(false);
    }
  };

  const downloadWorkshop = async () => {
    const idNum = Number(workshopId);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      setError('Workshop ID must be a positive number');
      return;
    }

    setRunning(true);
    setError(null);
    setOutput([]);
    try {
      const res = await apiFetch(`/api/instances/${instanceId}/steamcmd/workshop/download`, {
        method: 'POST',
        body: JSON.stringify({ workshopId: idNum })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setOutput((prev) => [...prev, `Done. exitCode=${data?.result?.code}`]);
    } catch (err: any) {
      setError(err?.message ?? 'Download failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>SteamCMD</h3>

      <div className="row">
        <button className="btn primary" onClick={() => void updateServer()} disabled={running}>
          Update DayZ Server
        </button>

        <div style={{ flex: 1 }} />

        <input
          className="input mono"
          style={{ width: 220 }}
          placeholder="Workshop ID"
          value={workshopId}
          onChange={(e) => setWorkshopId(e.target.value)}
        />
        <button className="btn" onClick={() => void downloadWorkshop()} disabled={running}>
          Download Workshop Mod
        </button>
      </div>

      {error ? (
        <div style={{ marginTop: 10, background: '#3a1a1a', border: '1px solid #6a2a2a', padding: 10, borderRadius: 10 }}>
          <span className="mono">{error}</span>
        </div>
      ) : null}

      <div className="mono" style={{ marginTop: 12, height: 420, overflow: 'auto', background: '#0b0f14', border: '1px solid #213044', borderRadius: 10, padding: 10 }}>
        {running ? <div>Running...</div> : null}
        {output.map((l, idx) => (
          <div key={idx}>{l}</div>
        ))}
      </div>

      <div style={{ marginTop: 12, opacity: 0.8, fontSize: 12 }}>
        Workshop downloads may require a Steam account that owns DayZ.
      </div>
    </div>
  );
}
