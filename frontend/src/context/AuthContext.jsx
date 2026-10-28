import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getCurrentCoordinator, loginCoordinator } from '../services/api';
import {
  clearSession,
  getStoredCoordinator,
  getToken,
  saveSession
} from '../utils/authStorage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [coordinator, setCoordinator] = useState(() =>
    getToken() ? getStoredCoordinator() : null
  );
  const [initializing, setInitializing] = useState(() => Boolean(getToken()));

  // Confirm a stored token with the backend before trusting the session.
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setInitializing(false);
      return undefined;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await getCurrentCoordinator();
        if (cancelled) return;
        const current = res.data.coordinator;
        setCoordinator(current);
        saveSession(token, current);
      } catch {
        if (cancelled) return;
        clearSession();
        setCoordinator(null);
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await loginCoordinator({ email, password });
    saveSession(res.data.token, res.data.coordinator);
    setCoordinator(res.data.coordinator);
    return res.data.coordinator;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setCoordinator(null);
  }, []);

  const value = useMemo(
    () => ({
      coordinator,
      isAuthenticated: Boolean(coordinator),
      initializing,
      login,
      logout
    }),
    [coordinator, initializing, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
