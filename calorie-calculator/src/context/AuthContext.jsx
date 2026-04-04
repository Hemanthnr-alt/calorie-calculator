import React, { createContext, useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api.js';

export const AuthContext = createContext();

/** Local-only guest session (no server account). */
export const OFFLINE_TOKEN = 'offline-local-token';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  const register = async (username, email, password) => {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    let data = {};
    try {
      data = await res.json();
    } catch {
      throw new Error(
        'Could not read server response. If you use npm run dev, keep the backend running and restart Vite after updating vite.config.'
      );
    }
    if (!res.ok) {
      throw new Error(data.error || `Registration failed (${res.status})`);
    }
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return data;
    }
    throw new Error(data.error || 'Registration failed');
  };

  const login = async (email, password) => {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    let data = {};
    try {
      data = await res.json();
    } catch {
      throw new Error(
        'Could not read server response. Is the API running? Try: backend folder → npm start, then refresh.'
      );
    }
    if (!res.ok) {
      throw new Error(data.error || `Login failed (${res.status})`);
    }
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return data;
    }
    throw new Error(data.error || 'Login failed');
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const continueOffline = useCallback(() => {
    let id = localStorage.getItem('offline_user_id');
    if (!id) {
      id = `local-${crypto.randomUUID()}`;
      localStorage.setItem('offline_user_id', id);
    }
    const nextUser = {
      id,
      username: 'Local',
      email: 'local@offline.app',
      offline: true,
    };
    localStorage.setItem('token', OFFLINE_TOKEN);
    localStorage.setItem('user', JSON.stringify(nextUser));
    setToken(OFFLINE_TOKEN);
    setUser(nextUser);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, register, login, logout, continueOffline }}>
      {children}
    </AuthContext.Provider>
  );
};
