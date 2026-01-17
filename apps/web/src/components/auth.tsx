import React from 'react';

/**
 * A tiny auth context.
 *
 * - Stores JWT token in localStorage
 * - Adds Authorization header in apiFetch()
 */

export type User = {
  id: string;
  username: string;
  displayName: string;
  role: 'ADMIN' | 'MOD' | 'VIEWER' | 'SYSTEM';
};

type AuthContextValue = {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  apiFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('AuthContext not available');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [token, setToken] = React.useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  const apiFetch = React.useCallback(
    (input: RequestInfo, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      headers.set('Content-Type', 'application/json');
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return fetch(input, { ...init, headers });
    },
    [token]
  );

  const refreshMe = React.useCallback(async () => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await apiFetch('/api/auth/me');
      if (!res.ok) throw new Error('Not authenticated');
      const data = (await res.json()) as { user: User };
      setUser(data.user);
    } catch {
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }, [token, apiFetch]);

  React.useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  const login = React.useCallback(
    async (username: string, password: string) => {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Login failed');
      }
      const data = (await res.json()) as { token: string };
      setToken(data.token);
      localStorage.setItem('token', data.token);
      // refresh user
      setLoading(true);
      await refreshMe();
    },
    [apiFetch, refreshMe]
  );

  const logout = React.useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  }, []);

  const value: AuthContextValue = {
    token,
    user,
    loading,
    login,
    logout,
    apiFetch
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
