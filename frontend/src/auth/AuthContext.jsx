import React, { createContext, useContext, useEffect, useState } from 'react';
import apiClient from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // cancelledRef — опциональный: если передан, перед каждым setState
  // проверяем, не "отменён" ли уже этот конкретный вызов (см. эффект ниже,
  // зачем это нужно). Вызовы извне (refresh() из контекста, login() без
  // второго аргумента) просто не передают cancelledRef и работают как раньше.
  const loadMe = async (cancelledRef) => {
    const token = localStorage.getItem('atm-access-token');
    if (!token) {
      if (!cancelledRef?.current) {
        setUser(null);
        setLoading(false);
      }
      return;
    }
    try {
      const { data } = await apiClient.get('/auth/me/');
      if (!cancelledRef?.current) setUser(data);
    } catch {
      localStorage.removeItem('atm-access-token');
      localStorage.removeItem('atm-refresh-token');
      if (!cancelledRef?.current) setUser(null);
    } finally {
      if (!cancelledRef?.current) setLoading(false);
    }
  };

  const login = ({ access, refresh }, cancelledRef) => {
    localStorage.setItem('atm-access-token', access);
    localStorage.setItem('atm-refresh-token', refresh);
    loadMe(cancelledRef);
  };

  useEffect(() => {
    // React.StrictMode (см. main.jsx) в dev-режиме намеренно вызывает каждый
    // эффект дважды подряд при монтировании (mount → cleanup → mount), чтобы
    // отловить эффекты без идемпотентной очистки. Без cancelledRef оба
    // прогона реально стартовали бы собственный запрос к /auth/me/, и в
    // зависимости от того, какой из двух ответов сети пришёл позже, user
    // мог измениться ДВАЖДЫ с разными ссылками на объект — это ломало логику
    // эффектов, зависящих от user (например, анимацию входа в Header.jsx,
    // которая иногда "зависала" из-за этой гонки). cancelledRef помечает
    // первый (отменённый) прогон, чтобы его запрос, даже когда ответит,
    // не трогал состояние — реальным остаётся только второй прогон.
    const cancelledRef = { current: false };
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const refresh = params.get('refresh');
    if (token && refresh) {
      // после OAuth-редиректа (GitHub/Google) backend подставляет токены
      // в query-параметры — подхватываем их один раз и чистим адресную строку
      login({ access: token, refresh }, cancelledRef);
      params.delete('token');
      params.delete('refresh');
      const rest = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (rest ? `?${rest}` : ''));
    } else {
      loadMe(cancelledRef);
    }
    return () => { cancelledRef.current = true; };
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
