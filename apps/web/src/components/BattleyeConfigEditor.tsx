import React from 'react';
import { useAuth } from './auth';

type BeConfig = {
  filePath: string;
  isActiveFile: boolean;
  entries: Record<string, string>;
  raw: string;
};

export default function BattleyeConfigEditor({ instanceId }: { instanceId: string }): JSX.Element {
  const { apiFetch } = useAuth();

  const [cfg, setCfg] = React.useState<BeConfig | null>(null);
  const [saving, setSaving] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      const res = await apiFetch(`/api/instances/${instanceId}/battleye/config`);
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { config: BeConfig };
      setCfg(data.config);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to read BattlEye config');
    }
  }, [apiFetch, instanceId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const updateField = (key: string, value: string) => {
    if (!cfg) return;
    setCfg({ ...cfg, entries: { ...cfg.entries, [key]: value } });
  };

  const saveEntries = async () => {
    if (!cfg) return;
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/instances/${instanceId}/battleye/config`, {
        method: 'PUT',
        body: JSON.stringify({ entries: cfg.entries })
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const deleteActive = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/instances/${instanceId}/battleye/delete-active`, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'Delete active failed');
    } finally {
      setSaving(false);
    }
  };

  if (!cfg) {
    return (
      <div className="card">
        <h3 style={{ marginTop: 0 }}>BattlEye Config</h3>
        {error ? <div className="mono">{error}</div> : <div>Loading...</div>}
      </div>
    );
  }

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>BattlEye Config</h3>
        <div className="row">
          <button className="btn" onClick={() => void load()} disabled={saving}>
            Refresh
          </button>
          <button className="btn" onClick={() => void deleteActive()} disabled={saving}>
            Delete active cfg
          </button>
          <button className="btn primary" onClick={() => void saveEntries()} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 10, opacity: 0.85 }}>
        <div className="label">File</div>
        <div className="mono">{cfg.filePath}</div>
        <div className="mono" style={{ opacity: 0.8 }}>
          {cfg.isActiveFile ? 'This is an active cfg (runtime). You usually edit BEServer_x64.cfg and then delete the active file.' : 'Static cfg'}
        </div>
      </div>

      {error ? (
        <div style={{ marginTop: 10, background: '#3a1a1a', border: '1px solid #6a2a2a', padding: 10, borderRadius: 10 }}>
          <span className="mono">{error}</span>
        </div>
      ) : null}

      <div className="row" style={{ marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <div className="label">RConPassword</div>
          <input className="input mono" value={cfg.entries.RConPassword || ''} onChange={(e) => updateField('RConPassword', e.target.value)} />
        </div>
        <div style={{ width: 180 }}>
          <div className="label">RConPort</div>
          <input className="input mono" value={cfg.entries.RConPort || ''} onChange={(e) => updateField('RConPort', e.target.value)} />
        </div>
        <div style={{ width: 180 }}>
          <div className="label">RestrictRCon</div>
          <input className="input mono" value={cfg.entries.RestrictRCon || ''} onChange={(e) => updateField('RestrictRCon', e.target.value)} />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div className="label">Raw</div>
        <textarea className="input mono" style={{ minHeight: 260 }} value={cfg.raw} readOnly />
      </div>
    </div>
  );
}
