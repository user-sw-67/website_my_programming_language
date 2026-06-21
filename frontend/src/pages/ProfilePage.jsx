import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import '../styles/profile.css';

const ROLE_LABEL = { member: 'Участник сообщества', developer: 'Разработчик языка', admin: 'Администратор' };
const LEVEL_LABEL = { junior: 'Junior', middle: 'Middle', senior: 'Senior' };
const SEVERITY_LABEL = { critical: 'Критическая', unclear: 'Непонятная', minor: 'Незначительная' };
const STATUS_LABEL = { open: 'Открыта', in_progress: 'В работе', resolved: 'Решена' };

export default function ProfilePage() {
  const { user, loading, refresh } = useAuth();
  const [tab, setTab] = useState('settings');
  const [form, setForm] = useState({ bio: '', avatar_url: '' });
  const [saveStatus, setSaveStatus] = useState(null);
  const [issues, setIssues] = useState(null);
  const [newIssue, setNewIssue] = useState({ title: '', description: '', severity: 'unclear' });
  const [creating, setCreating] = useState(false);
  const [projects, setProjects] = useState(null);

  useEffect(() => {
    if (user) setForm({ bio: user.bio || '', avatar_url: user.avatar_url || '' });
  }, [user]);

  useEffect(() => {
    if (tab === 'issues' && user) {
      apiClient.get('/issues/', { params: { mine: 'true' } })
        .then(({ data }) => setIssues(Array.isArray(data) ? data : data.results || []))
        .catch(() => setIssues([]));
    }
    if (tab === 'projects' && user) {
      apiClient.get('/projects/items/', { params: { mine: 'true' } })
        .then(({ data }) => setProjects(Array.isArray(data) ? data : data.results || []))
        .catch(() => setProjects([]));
    }
  }, [tab, user]);

  const deleteProject = async (id) => {
    if (!window.confirm('Удалить проект со всеми файлами? Это нельзя отменить.')) return;
    try {
      await apiClient.delete(`/projects/items/${id}/`);
      setProjects((list) => list.filter((p) => p.id !== id));
    } catch {
      setSaveStatus({ ok: false, text: 'Не удалось удалить проект.' });
    }
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    setSaveStatus(null);
    try {
      await apiClient.patch('/auth/me/', form);
      await refresh();
      setSaveStatus({ ok: true, text: 'Сохранено.' });
    } catch {
      setSaveStatus({ ok: false, text: 'Бэкенд недоступен — изменения не сохранены.' });
    }
  };

  const submitIssue = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { data } = await apiClient.post('/issues/', newIssue);
      setIssues((list) => [data, ...(list || [])]);
      setNewIssue({ title: '', description: '', severity: 'unclear' });
    } catch {
      setSaveStatus({ ok: false, text: 'Не удалось создать обращение — бэкенд недоступен.' });
    } finally {
      setCreating(false);
    }
  };

  if (loading) return null;

  if (!user) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <h2>Нужно войти</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Профиль доступен только авторизованным пользователям.</p>
        <Link to="/" className="btn btn-primary">На главную</Link>
      </div>
    );
  }

  return (
    <div className="profile-grid">
      <div className="card profile-card">
        <div className="profile-card__avatar">{user.username.slice(0, 1).toUpperCase()}</div>
        <h2 style={{ margin: '0 0 0.2rem' }}>{user.username}</h2>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{user.email}</div>
        <span className="badge profile-card__role">{ROLE_LABEL[user.role] || user.role}</span>
        {user.developer_level && (
          <span className="badge" style={{ marginTop: '0.4rem' }}>{LEVEL_LABEL[user.developer_level]}</span>
        )}
        {user.developer_key && (
          <div className="profile-card__key" title="Уникальный ключ разработчика — по нему вас можно найти">
            {user.developer_key}
          </div>
        )}
      </div>

      <div className="card">
        <div className="profile-tabs">
          <div className={`profile-tab ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>
            Настройки
          </div>
          <div className={`profile-tab ${tab === 'issues' ? 'active' : ''}`} onClick={() => setTab('issues')}>
            Мои баги и проблемы
          </div>
          <div className={`profile-tab ${tab === 'projects' ? 'active' : ''}`} onClick={() => setTab('projects')}>
            Мои проекты
          </div>
        </div>

        {tab === 'settings' && (
          <form onSubmit={saveSettings} className="profile-section">
            <div className="profile-field">
              <label>О себе</label>
              <textarea
                rows={3}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            </div>
            <div className="profile-field">
              <label>URL аватара</label>
              <input
                type="text"
                value={form.avatar_url}
                onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
                placeholder="https://…"
              />
            </div>
            {saveStatus && (
              <p style={{ color: saveStatus.ok ? 'var(--accent)' : 'var(--danger)', fontSize: '0.85rem' }}>
                {saveStatus.text}
              </p>
            )}
            <button className="btn btn-primary">Сохранить</button>
          </form>
        )}

        {tab === 'issues' && (
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              Здесь видны только обращения, которые сообщили вы — раздел «Проблемы» в шапке сайта
              предназначен для разработчиков и показывает все баги сообщества.
            </p>

            <form onSubmit={submitIssue} className="card" style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem' }}>Сообщить о новой проблеме</h3>
              <div className="profile-field">
                <label>Заголовок</label>
                <input
                  type="text"
                  required
                  value={newIssue.title}
                  onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
                />
              </div>
              <div className="profile-field">
                <label>Описание</label>
                <textarea
                  rows={3}
                  required
                  value={newIssue.description}
                  onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                />
              </div>
              <div className="profile-field">
                <label>Серьёзность</label>
                <select
                  value={newIssue.severity}
                  onChange={(e) => setNewIssue({ ...newIssue, severity: e.target.value })}
                >
                  <option value="critical">Критическая</option>
                  <option value="unclear">Непонятная</option>
                  <option value="minor">Незначительная</option>
                </select>
              </div>
              <button className="btn btn-primary" disabled={creating}>
                {creating ? <span className="skeleton-spin" /> : 'Отправить'}
              </button>
            </form>

            {issues === null && <p style={{ color: 'var(--text-secondary)' }}>Загрузка…</p>}
            {issues && issues.length === 0 && (
              <p style={{ color: 'var(--text-secondary)' }}>Вы пока ничего не сообщали.</p>
            )}
            {issues && issues.map((issue) => (
              <div key={issue.id} className="my-issue-row">
                <span>{issue.title}</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span className={`badge badge--severity-${issue.severity}`}>{SEVERITY_LABEL[issue.severity]}</span>
                  <span className="badge">{STATUS_LABEL[issue.status]}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'projects' && (
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              Все ваши проекты в редакторе — выберите, какой открыть для правки, или скачайте/удалите.
            </p>
            {projects === null && <p style={{ color: 'var(--text-secondary)' }}>Загрузка…</p>}
            {projects && projects.length === 0 && (
              <p style={{ color: 'var(--text-secondary)' }}>
                Проектов пока нет — создайте первый в <Link to="/editor">редакторе</Link>.
              </p>
            )}
            {projects && projects.map((p) => (
              <div key={p.id} className="my-issue-row">
                <div>
                  <strong>{p.name}</strong>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    обновлён {new Date(p.updated_at).toLocaleDateString('ru-RU')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link to={`/editor?project=${p.id}`} className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}>
                    Открыть
                  </Link>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem', color: 'var(--danger)' }}
                    onClick={() => deleteProject(p.id)}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
