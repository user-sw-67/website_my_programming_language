import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import apiClient from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import '../styles/auth.css';

export default function CreateTopicModal({ open, onClose, onCreated }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ title: '', body: '', tags: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.post('/forum/topics/', {
        title: form.title,
        body: form.body,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      });
      onCreated(data);
      setForm({ title: '', body: '', tags: '' });
      onClose();
    } catch {
      setError('Не удалось создать вопрос — бэкенд недоступен.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="auth-backdrop" onClick={onClose}>
      <div className="auth-modal" style={{ width: 460 }} onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal__close" onClick={onClose}>✕</button>
        <h3 style={{ marginTop: 0 }}>Новый вопрос</h3>

        {!user ? (
          <p style={{ color: 'var(--text-secondary)' }}>
            Войдите через кнопку «Войти» в шапке сайта, чтобы задать вопрос сообществу.
          </p>
        ) : (
          <form onSubmit={submit}>
            <div className="auth-field">
              <label>Заголовок</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="auth-field">
              <label>Текст вопроса</label>
              <textarea
                rows={5}
                required
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </div>
            <div className="auth-field">
              <label>Теги (через запятую)</label>
              <input
                type="text"
                placeholder="typing, classes"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
              />
            </div>
            {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>}
            <button className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? <span className="skeleton-spin" /> : 'Опубликовать'}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
