import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/auth';

type Instance = {
  id: string;
  name: string;
  type: string;
  paths: {
    root: string;
  };
  network: {
    host: string;
    gamePort: number;
    rconPort: number;
  };
};

export default function InstancesPage(): JSX.Element {
  const { apiFetch } = useAuth();

  const [items, setItems] = React.useState<Instance[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/instances');
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { instances: Instance[] };
      setItems(data.instances);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load instances');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Instances</h2>
        <button className="btn" onClick={() => void load()} disabled={loading}>
          Refresh
        </button>
      </div>

      {error ? (
        <div className="card" style={{ marginTop: 12, background: '#3a1a1a', borderColor: '#6a2a2a' }}>
          <span className="mono">{error}</span>
        </div>
      ) : null}

      <div className="card" style={{ marginTop: 12 }}>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Host</th>
                <th>Ports</th>
                <th>Root</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  <td>
                    <Link to={`/instances/${it.id}`}>{it.id}</Link>
                  </td>
                  <td>{it.name}</td>
                  <td className="mono">{it.network.host}</td>
                  <td className="mono">
                    game: {it.network.gamePort} / rcon: {it.network.rconPort}
                  </td>
                  <td className="mono">{it.paths.root}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginTop: 12, opacity: 0.9 }}>
        <h3 style={{ marginTop: 0 }}>Tip</h3>
        <p style={{ marginBottom: 0 }}>
          You can edit instance paths and server arguments from the instance details page. All configs are stored locally in
          <span className="mono"> data/InstanceConfig</span>.
        </p>
      </div>
    </div>
  );
}
