import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch('/api/me');
      setUser(data.user);
      setMeta({
        app: data.app,
        financialYears: data.financialYears,
        disclaimers: data.disclaimers,
      });
    } catch {
      setUser(null);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (payload) => {
    const data = await apiFetch('/api/auth/login', { method: 'POST', body: payload });
    setUser(data.user);
    await refresh();
    return data.user;
  }, [refresh]);

  const signup = useCallback(async (payload) => {
    const data = await apiFetch('/api/auth/signup', { method: 'POST', body: payload });
    setUser(data.user);
    await refresh();
    return data.user;
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setMeta(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      meta,
      loading,
      isAuthenticated: Boolean(user),
      login,
      signup,
      logout,
      refresh,
    }),
    [user, meta, loading, login, signup, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
