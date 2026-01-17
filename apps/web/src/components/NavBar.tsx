import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './auth';

export default function NavBar(): JSX.Element {
  const { user, logout } = useAuth();

  return (
    <div style={{ borderBottom: '1px solid #213044', background: '#0b0f14' }}>
      <div
        className="container"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/instances" style={{ textDecoration: 'none', fontWeight: 700 }}>
            DayZ Local Panel
          </Link>
          <span style={{ opacity: 0.7, fontSize: 12 }}>OmegaManager / CF Tools inspired</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {user ? (
            <>
              <span style={{ fontSize: 12, opacity: 0.85 }}>
                {user.displayName} ({user.role})
              </span>
              <button className="btn" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <span style={{ fontSize: 12, opacity: 0.85 }}>Not logged in</span>
          )}
        </div>
      </div>
    </div>
  );
}
