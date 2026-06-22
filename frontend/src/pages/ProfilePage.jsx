import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import apiClient from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { useConfirm } from '../ui/FeedbackContext.jsx';
import ChatTranscript from '../components/ChatTranscript.jsx';
import Avatar from '../components/Avatar.jsx';
import '../styles/profile.css';
import '../styles/chat.css';
import '../styles/admin.css';

const ROLE_LABEL = { member: 'Участник сообщества', developer: 'Разработчик языка', admin: 'Администратор' };
const LEVEL_LABEL = { junior: 'Junior', middle: 'Middle', senior: 'Senior' };
const SEVERITY_LABEL = { critical: 'Критическая', unclear: 'Непонятная', minor: 'Незначительная' };
const STATUS_LABEL = { open: 'Открыта', in_progress: 'В работе', resolved: 'Решена' };

function AvatarField({ value, onChange }) {
  const [mode, setMode] = useState('url');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const onFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('avatar', file);
      const { data } = await apiClient.post('/auth/me/avatar/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onChange(data.url);
    } catch (err) {
      setError(err.response?.data?.avatar?.[0] || 'Не удалось загрузить файл.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="profile-field">
      <label>Аватар</label>
      <div className="news-image-input">
        <div className="news-image-input__tabs">
          <button type="button" className={`news-image-input__tab ${mode === 'url' ? 'news-image-input__tab--active' : ''}`} onClick={() => setMode('url')}>
            Ссылка
          </button>
          <button type="button" className={`news-image-input__tab ${mode === 'file' ? 'news-image-input__tab--active' : ''}`} onClick={() => setMode('file')}>
            Загрузить файл
          </button>
        </div>
        {mode === 'url' ? (
          <input type="text" placeholder="https://…" value={value} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <label className="news-image-input__dropzone">
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => onFile(e.target.files?.[0])} />
            {uploading ? 'Загрузка…' : 'Нажмите, чтобы выбрать файл (до 3 МБ)'}
          </label>
        )}
        {error && <p style={{ color: 'var(--danger)', fontSize: '0.78rem', margin: 0 }}>{error}</p>}
      </div>
    </div>
  );
}
function SupportHistoryTab() {
  const [sessions, setSessions] = useState(null);
  const [channel, setChannel] = useState('ai'); // 'ai' | 'developer'
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    // только завершённые — текущий (ещё не закрытый) разговор живёт в
    // плавающем виджете поддержки, в профиле ему не место: иначе тут вечно
    // висел бы один и тот же "текущий" пункт
    apiClient.get('/support/sessions/?mine=true&status=closed')
      .then(({ data }) => setSessions(Array.isArray(data) ? data : data.results || []))
      .catch(() => setSessions([]));
  }, []);

  const onUpdate = (updated) => {
    setSessions((list) => list?.map((s) => (s.id === updated.id ? updated : s)));
  };

  const filtered = sessions?.filter((s) => (channel === 'ai' ? !s.developer : !!s.developer)) || [];
  const active = filtered.find((s) => s.id === activeId);

  return (
    <div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
        Завершённые обращения в чат поддержки — отдельно разговоры с ИИ-помощником и с
        живыми разработчиками. Можно перечитать и оценить, если вы ещё не оставили оценку.
      </p>
      <div className="profile-tabs" style={{ marginBottom: '1rem' }}>
        <div className={`profile-tab ${channel === 'ai' ? 'active' : ''}`} onClick={() => { setChannel('ai'); setActiveId(null); }}>
          С ИИ-помощником
        </div>
        <div className={`profile-tab ${channel === 'developer' ? 'active' : ''}`} onClick={() => { setChannel('developer'); setActiveId(null); }}>
          С разработчиками
        </div>
      </div>
      <div className="support-queue-grid">
        <div className="card" style={{ padding: '0.5rem' }}>
          {sessions === null && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '0.75rem' }}>Загрузка…</p>}
          {sessions && filtered.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '0.75rem' }}>
              {channel === 'ai' ? 'Завершённых разговоров с ИИ пока нет.' : 'Завершённых разговоров с разработчиками пока нет.'}
            </p>
          )}
          {filtered.map((s) => (
            <div
              key={s.id}
              className={`support-ticket ${activeId === s.id ? 'active' : ''}`}
              onClick={() => setActiveId(s.id)}
            >
              <span className="support-ticket__status-dot support-ticket__status-dot--closed" />
              <div className="support-ticket__body">
                <div className="support-ticket__name">{new Date(s.created_at).toLocaleDateString('ru-RU')}</div>
              </div>
              {s.rating && <span style={{ color: '#f59e0b', fontSize: '0.78rem' }}>{'★'.repeat(s.rating)}</span>}
            </div>
          ))}
        </div>
        <div className="card chat-panel__inner" style={{ height: 480, padding: 0 }}>
          {!active ? (
            <p style={{ color: 'var(--text-secondary)', padding: '1rem' }}>Выберите обращение слева.</p>
          ) : (
            <ChatTranscript sessionId={active.id} allowRating onUpdate={onUpdate} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, loading, refresh, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'settings');
  const [form, setForm] = useState({ display_name: '', bio: '', avatar_url: '', github_url: '' });
  const [saveStatus, setSaveStatus] = useState(null);
  const [issues, setIssues] = useState(null);
  const [newIssue, setNewIssue] = useState({ title: '', description: '', severity: 'unclear' });
  const [creating, setCreating] = useState(false);
  const [projects, setProjects] = useState(null);
  const confirm = useConfirm();

  useEffect(() => {
    if (user) {
      setForm({
        display_name: user.display_name || '',
        bio: user.bio || '',
        avatar_url: user.avatar_url || '',
        github_url: user.github_url || '',
      });
    }
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
    const ok = await confirm({
      title: 'Удалить проект?',
      text: 'Все файлы и папки внутри проекта будут удалены без возможности восстановления.',
      confirmLabel: 'Удалить',
      danger: true,
    });
    if (!ok) return;
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
        <Avatar user={user} size={84} className="profile-card__avatar" />
        <h2 style={{ margin: '0.6rem 0 0.1rem' }}>{user.display_name || user.username}</h2>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }} title="Логин — используется для входа и поиска">
          @{user.username}
        </div>
        {/* почта видна только самому пользователю — единственное место на
            сайте, где она отображается, даже разработчики её не видят */}
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{user.email}</div>
        {user.github_url && (
          <a href={user.github_url} target="_blank" rel="noreferrer" className="profile-card__github">
            🐙 GitHub
          </a>
        )}
        <div className="profile-card__badges">
          {/* разработчики и админы — тоже участники сообщества, просто с
              расширенными правами, поэтому помимо роли и уровня показываем
              и этот базовый статус (для обычных участников он и так есть
              в самой роли — отдельно дублировать не нужно) */}
          {user.is_developer && <span className="badge">Участник сообщества</span>}
          <span className="badge">{ROLE_LABEL[user.role] || user.role}</span>
          {user.developer_level && (
            <span className="badge">{LEVEL_LABEL[user.developer_level]}</span>
          )}
        </div>
        {user.developer_key && (
          <div className="profile-card__key" title="Уникальный ключ разработчика — по нему вас можно найти">
            {user.developer_key}
          </div>
        )}
        <button className="profile-card__logout" onClick={logout}>Выйти из аккаунта</button>
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
          <div className={`profile-tab ${tab === 'support' ? 'active' : ''}`} onClick={() => setTab('support')}>
            Поддержка
          </div>
        </div>

        {tab === 'settings' && (
          <form onSubmit={saveSettings} className="profile-section">
            <div className="profile-field">
              <label>Имя</label>
              <input
                type="text"
                maxLength={80}
                placeholder={user.username}
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', margin: '0.3rem 0 0' }}>
                Именно это имя видят остальные везде на сайте. Логин (<strong>@{user.username}</strong>) — отдельно,
                для входа в аккаунт и поиска, и не меняется.
              </p>
            </div>
            <AvatarField value={form.avatar_url} onChange={(url) => setForm({ ...form, avatar_url: url })} />
            <div className="profile-field">
              <label>GitHub</label>
              <input
                type="text"
                placeholder="https://github.com/…"
                value={form.github_url}
                onChange={(e) => setForm({ ...form, github_url: e.target.value })}
              />
            </div>
            <div className="profile-field">
              <label>О себе</label>
              <textarea
                rows={3}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            </div>
            <div className="profile-field">
              <label>Почта</label>
              <input type="text" value={user.email} disabled title="Почта видна только вам — её не видят даже разработчики" />
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

        {tab === 'support' && <SupportHistoryTab />}
      </div>
    </div>
  );
}
