import React from 'react';
import { useAuth } from './auth';

export default function SchedulerEditor({ instanceId }: { instanceId: string }): JSX.Element {
  const { apiFetch, user } = useAuth();
  const [jsonText, setJsonText] = React.useState<string>('');
  const [error, setError] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    setOk(null);
    try {
      const res = await apiFetch(`/api/instances/${instanceId}/scheduler/tasks`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setJsonText(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load');
    }
  }, [apiFetch, instanceId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setError(null);
    setOk(null);
    try {
      const parsed = JSON.parse(jsonText);
      const res = await apiFetch(`/api/instances/${instanceId}/scheduler/tasks`, {
        method: 'PUT',
        body: JSON.stringify(parsed)
      });
      if (!res.ok) throw new Error(await res.text());
      setOk('Saved');
    } catch (err: any) {
      setError(err?.message ?? 'Save failed');
    }
  };

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>Scheduler</h3>
        <div className="row">
          <button className="btn" onClick={() => void load()}>
            Reload
          </button>
          <button className="btn primary" onClick={() => void save()} disabled={user?.role !== 'ADMIN'}>
            Save (ADMIN)
          </button>
        </div>
      </div>

      {error ? (
        <div style={{ marginTop: 10, background: '#3a1a1a', border: '1px solid #6a2a2a', padding: 10, borderRadius: 10 }}>
          <span className="mono">{error}</span>
        </div>
      ) : null}

      {ok ? (
        <div style={{ marginTop: 10, background: '#17381d', border: '1px solid #265c2f', padding: 10, borderRadius: 10 }}>
          <span className="mono">{ok}</span>
        </div>
      ) : null}

      <textarea className="input mono" style={{ marginTop: 12, height: 520 }} value={jsonText} onChange={(e) => setJsonText(e.target.value)} />

      <div style={{ marginTop: 12, opacity: 0.8, fontSize: 12 }}>
        Format: {{"tasks":[{{"id":"backup","cron":"0 3 * * *","enabled":true,"action":{{"type":"SERVER_RESTART"}}}}]}}
      </div>
    </div>
  );
}
