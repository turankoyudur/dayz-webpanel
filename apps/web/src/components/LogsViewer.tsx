import React from 'react';
import { useAuth } from './auth';

type LogItem = {
  label: string;
  rootKey: 'root' | 'profiles' | 'battleye';
  path: string;
};

type LogsListResponse = {
  instanceId: string;
  panelLogs: LogItem[];
  profileLogs: LogItem[];
};

export default function LogsViewer({ instanceId }: { instanceId: string }): JSX.Element {
  const { apiFetch } = useAuth();

  const [list, setList] = React.useState<LogsListResponse | null>(null);
  const [selected, setSelected] = React.useState<LogItem | null>(null);
  const [tail, setTail] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const loadList = React.useCallback(async () => {
    setError(null);
    try {
      const res = await apiFetch(`/api/instances/${instanceId}/logs/list`);
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as LogsListResponse;
      setList(data);
      const first = data.panelLogs[0] || data.profileLogs[0] || null;
      setSelected(first);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load logs');
    }
  }, [apiFetch, instanceId]);

  const loadTail = React.useCallback(
    async (item: LogItem | null) => {
      if (!item) return;
      setError(null);
      try {
        const url = `/api/instances/${instanceId}/logs/tail?rootKey=${item.rootKey}&path=${encodeURIComponent(item.path)}&lines=200`;
        const res = await apiFetch(url);
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as { lines: string[] };
        setTail(data.lines || []);
      } catch (err: any) {
        setError(err?.message ?? 'Failed to tail log');
      }
    },
    [apiFetch, instanceId]
  );

  React.useEffect(() => {
    void loadList();
  }, [loadList]);

  React.useEffect(() => {
    void loadTail(selected);
  }, [selected, loadTail]);

  return (
    <div className="row" style={{ alignItems: 'stretch' }}>
      <div className="card" style={{ width: 360 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>Logs</h3>
          <button className="btn" onClick={() => void loadList()}>
            Refresh
          </button>
        </div>

        {error ? (
          <div style={{ marginTop: 10, background: '#3a1a1a', border: '1px solid #6a2a2a', padding: 10, borderRadius: 10 }}>
            <span className="mono">{error}</span>
          </div>
        ) : null}

        {!list ? (
          <div style={{ marginTop: 10 }}>Loading...</div>
        ) : (
          <>
            <div style={{ marginTop: 12 }}>
              <div className="label">Panel logs</div>
              <div className="mono" style={{ fontSize: 12, opacity: 0.75 }}>
                (console/rcon/steamcmd/audit)
              </div>
              <div style={{ marginTop: 6 }}>
                {list.panelLogs.map((it) => (
                  <button
                    key={it.path}
                    className={selected?.path === it.path ? 'btn primary' : 'btn'}
                    style={{ width: '100%', marginBottom: 6, textAlign: 'left' }}
                    onClick={() => setSelected(it)}
                  >
                    {it.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div className="label">Profiles logs</div>
              <div className="mono" style={{ fontSize: 12, opacity: 0.75 }}>
                (DayZ .RPT / .ADM / etc)
              </div>
              <div style={{ marginTop: 6, maxHeight: 220, overflow: 'auto' }}>
                {list.profileLogs.map((it) => (
                  <button
                    key={it.path}
                    className={selected?.path === it.path ? 'btn primary' : 'btn'}
                    style={{ width: '100%', marginBottom: 6, textAlign: 'left' }}
                    onClick={() => setSelected(it)}
                  >
                    {it.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="card" style={{ flex: 1 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Tail</h3>
          <button className="btn" onClick={() => void loadTail(selected)} disabled={!selected}>
            Reload tail
          </button>
        </div>

        <div className="mono" style={{ marginTop: 12, height: 520, overflow: 'auto', background: '#0b0f14', border: '1px solid #213044', borderRadius: 10, padding: 10 }}>
          {tail.map((l, idx) => (
            <div key={idx}>{l}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
