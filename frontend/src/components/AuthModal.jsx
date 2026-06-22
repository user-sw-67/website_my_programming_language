import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import apiClient from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import '../styles/auth.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export default function AuthModal({ open, onClose }) {
  const { login } = useAuth();
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      if (tab === 'register') {
        await apiClient.post('/auth/register/', form);
        setStatus({ ok: true, text: 'Аккаунт создан, теперь можно войти.' });
        setTab('login');
      } else {
        const { data } = await apiClient.post('/auth/login/', {
          username: form.username,
          password: form.password,
        });
        login(data);
        setStatus({ ok: true, text: 'Успешный вход!' });
        onClose();
      }
    } catch (err) {
      setStatus({ ok: false, text: err.response?.data?.detail || 'Бэкенд недоступен или данные неверны.' });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="auth-backdrop" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal__close" onClick={onClose}>✕</button>

        <div className="auth-modal__tabs">
          <div className={`auth-modal__tab ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>
            Вход
          </div>
          <div className={`auth-modal__tab ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>
            Регистрация
          </div>
        </div>

        <div className="auth-oauth">
          <a className="auth-oauth-btn" href={`${API_BASE}/auth/social/login/github/`}>
            🐙 Войти через GitHub
          </a>
          <a className="auth-oauth-btn" href={`${API_BASE}/auth/social/login/google-oauth2/`}>
            🔵 Войти через Google
          </a>
        </div>

        <div className="auth-divider">или по почте</div>

        <form onSubmit={submit}>
          <div className="auth-field">
            <label>Логин</label>
            <input type="text" value={form.username} onChange={update('username')} required />
          </div>
          {tab === 'register' && (
            <div className="auth-field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={update('email')} required />
            </div>
          )}
          <div className="auth-field">
            <label>Пароль</label>
            <input type="password" value={form.password} onChange={update('password')} required />
          </div>

          {status && (
            <p style={{ color: status.ok ? 'var(--accent)' : 'var(--danger)', fontSize: '0.85rem' }}>
              {status.text}
            </p>
          )}

          <button className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? <span className="skeleton-spin" /> : tab === 'login' ? 'Войти' : 'Создать аккаунт'}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}
