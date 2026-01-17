import React from 'react';
import { useAuth } from './auth';

type RootKey = 'root' | 'profiles' | 'battleye';

type FileItem = {
  name: string;
  kind: 'file' | 'dir';
  size: number;
  mtimeMs: number;
  path: string; // relative path inside the selected root
};

type ListResponse = {
  rootKey: RootKey;
  path: string;
  items: FileItem[];
};

export default function FileManager({ instanceId }: { instanceId: string }): JSX.Element {
  const { apiFetch } = useAuth();

  const [rootKey, setRootKey] = React.useState<RootKey>('root');
  const [cwd, setCwd] = React.useState<string>('');
  const [items, setItems] = React.useState<FileItem[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const [openFile, setOpenFile] = React.useState<string | null>(null);
  const [fileContent, setFileContent] = React.useState<string>('');
  const [saving, setSaving] = React.useState<boolean>(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/instances/${instanceId}/files/list?rootKey=${rootKey}&path=${encodeURIComponent(cwd)}`;
      const res = await apiFetch(url);
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as ListResponse;
      setItems(data.items);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to list directory');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, instanceId, rootKey, cwd]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const open = async (relPath: string) => {
    setError(null);
    setOpenFile(relPath);
    try {
      const url = `/api/instances/${instanceId}/files/read?rootKey=${rootKey}&path=${encodeURIComponent(relPath)}`;
      const res = await apiFetch(url);
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { content: string };
      setFileContent(data.content);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to read file');
    }
  };

  const save = async () => {
    if (!openFile) return;
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/instances/${instanceId}/files/write`, {
        method: 'PUT',
        body: JSON.stringify({ rootKey, path: openFile, content: fileContent })
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const goUp = () => {
    if (!cwd) return;
    const parts = cwd.split(/[\\/]/).filter(Boolean);
    parts.pop();
    setCwd(parts.join('/'));
    setOpenFile(null);
  };

  return (
    <div className="row" style={{ alignItems: 'stretch' }}>
      <div className="card" style={{ flex: 1, minWidth: 420 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="label">Root</div>
            <div className="row">
              <button className="btn" onClick={() => { setRootKey('root'); setCwd(''); setOpenFile(null); }}>
                Server Root
              </button>
              <button className="btn" onClick={() => { setRootKey('profiles'); setCwd(''); setOpenFile(null); }}>
                Profiles
              </button>
              <button className="btn" onClick={() => { setRootKey('battleye'); setCwd(''); setOpenFile(null); }}>
                BattlEye
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div className="label">Path</div>
            <div className="mono">/{cwd || ''}</div>
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 6 }}>
              <button className="btn" onClick={goUp} disabled={!cwd}>
                Up
              </button>
              <button className="btn" onClick={() => void load()} disabled={loading}>
                Refresh
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div style={{ marginTop: 10, background: '#3a1a1a', border: '1px solid #6a2a2a', padding: 10, borderRadius: 10 }}>
            <span className="mono">{error}</span>
          </div>
        ) : null}

        {loading ? (
          <div style={{ marginTop: 10 }}>Loading...</div>
        ) : (
          <table className="table" style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Size</th>
                <th>Modified</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr
                  key={it.path}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    if (it.kind === 'dir') {
                      setCwd(it.path);
                      setOpenFile(null);
                    } else {
                      void open(it.path);
                    }
                  }}
                >
                  <td className="mono">{it.name}</td>
                  <td>{it.kind}</td>
                  <td className="mono">{it.kind === 'file' ? it.size : ''}</td>
                  <td className="mono">{new Date(it.mtimeMs).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ flex: 1, minWidth: 420 }}>
        <h3 style={{ marginTop: 0 }}>Editor</h3>

        {openFile ? (
          <>
            <div className="label">File</div>
            <div className="mono" style={{ marginBottom: 10 }}>
              {openFile}
            </div>

            <textarea
              className="input mono"
              style={{ minHeight: 380 }}
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
            />

            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
              <button className="btn primary" onClick={() => void save()} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </>
        ) : (
          <div style={{ opacity: 0.85 }}>Select a file from the left to view/edit.</div>
        )}
      </div>
    </div>
  );
}
