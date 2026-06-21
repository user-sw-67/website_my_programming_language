import React, { createContext, useContext, useEffect, useState } from 'react';
import apiClient from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = async () => {
    const token = localStorage.getItem('atm-access-token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await apiClient.get('/auth/me/');
      setUser(data);
    } catch {
      localStorage.removeItem('atm-access-token');
      localStorage.removeItem('atm-refresh-token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = ({ access, refresh }) => {
    localStorage.setItem('atm-access-token', access);
    localStorage.setItem('atm-refresh-token', refresh);
    loadMe();
  };

  useEffect(() => {
    // после OAuth-редиректа (GitHub/Google) backend подставляет токены
    // в query-параметры — подхватываем их один раз и чистим адресную строку
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const refresh = params.get('refresh');
    if (token && refresh) {
      login({ access: token, refresh });
      params.delete('token');
      params.delete('refresh');
      const rest = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (rest ? `?${rest}` : ''));
    } else {
      loadMe();
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('atm-access-token');
    localStorage.removeItem('atm-refresh-token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh: loadMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
