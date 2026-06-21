import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import apiClient from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import '../styles/auth.css';

export default function GithubPushModal({ open, onClose, files }) {
  const { user } = useAuth();
  const [repoName, setRepoName] = useState('my-atom-project');
  const [message, setMessage] = useState('Обновление из редактора ATOM');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const { data } = await apiClient.post('/projects/github/push/', { repo_name: repoName, files, message });
      setResult({ ok: true, text: 'Запушено!', url: data.repo_url });
    } catch (err) {
      setResult({ ok: false, text: err.response?.data?.detail || 'Бэкенд недоступен.' });
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="auth-backdrop" onClick={onClose}>
      <div className="auth-modal" style={{ width: 420 }} onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal__close" onClick={onClose}>✕</button>
        <h3 style={{ marginTop: 0 }}>🐙 Закоммитить на GitHub</h3>

        {!user ? (
          <p style={{ color: 'var(--text-secondary)' }}>
            Войдите через GitHub (кнопка «Войти» в шапке), чтобы запушить проект в свой репозиторий.
          </p>
        ) : (
          <form onSubmit={submit}>
            <div className="auth-field">
              <label>Имя репозитория</label>
              <input type="text" required value={repoName} onChange={(e) => setRepoName(e.target.value)} />
            </div>
            <div className="auth-field">
              <label>Сообщение коммита</label>
              <input type="text" required value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              Будет создан (или обновлён) репозиторий {repoName || '…'} в вашем GitHub-аккаунте,
              в него запишутся все {Object.keys(files).length} файл(ов) текущего проекта.
            </p>

            {result && (
              <p style={{ color: result.ok ? 'var(--accent)' : 'var(--danger)', fontSize: '0.85rem' }}>
                {result.text}{' '}
                {result.url && <a href={result.url} target="_blank" rel="noreferrer">{result.url}</a>}
              </p>
            )}

            <button className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? <span className="skeleton-spin" /> : 'Запушить'}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
