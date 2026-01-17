import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/auth';

export default function LoginPage(): JSX.Element {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  const [username, setUsername] = React.useState('admin');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (user) {
      nav('/instances', { replace: true });
    }
  }, [user, nav]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(username, password);
      const state = location.state as any;
      const target = state?.from?.pathname ?? '/instances';
      nav(target, { replace: true });
    } catch (err: any) {
      setError(err?.message ?? 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 460, margin: '40px auto' }}>
        <h2 style={{ marginTop: 0 }}>Login</h2>
        <p style={{ opacity: 0.85, marginTop: 0 }}>
          First run credentials are written to:
          <span className="mono"> data\SystemConfig\FIRST_RUN_CREDENTIALS.txt</span>
        </p>

        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: 12 }}>
            <div className="label">Username</div>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div className="label">Password</div>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>

          {error ? (
            <div style={{ background: '#3a1a1a', border: '1px solid #6a2a2a', padding: 10, borderRadius: 10 }}>
              <span className="mono">{error}</span>
            </div>
          ) : null}

          <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
            <button className="btn primary" type="submit" disabled={busy}>
              {busy ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
