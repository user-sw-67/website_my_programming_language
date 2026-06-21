import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import ChatPanel from '../components/ChatPanel.jsx';

const LEVEL_LABEL = { junior: 'Junior', middle: 'Middle', senior: 'Senior' };

const STAT_CARDS = [
  { key: 'users_total', label: 'Пользователей всего' },
  { key: 'feedback_unanswered', label: 'Отзывов без ответа' },
  { key: 'forum_topics_unresolved', label: 'Нерешённых тем форума' },
  { key: 'issues_open', label: 'Открытых проблем' },
  { key: 'news_total', label: 'Новостей опубликовано' },
  { key: 'projects_total', label: 'Проектов пользователей' },
];

function StatsTab({ stats }) {
  if (!stats) return <p style={{ color: 'var(--text-secondary)' }}>Загрузка…</p>;
  return (
    <div className="card-grid">
      {STAT_CARDS.map((c) => (
        <div key={c.key} className="card">
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent)' }}>{stats[c.key]}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{c.label}</div>
        </div>
      ))}
      <div className="card">
        <div className="eyebrow" style={{ marginBottom: '0.5rem' }}>разработчики по уровню</div>
        {Object.entries(stats.developers_by_level).map(([level, count]) => (
          <div key={level} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '0.25rem 0' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{LEVEL_LABEL[level]}</span>
            <strong>{count}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function LogsTab({ logs }) {
  if (!logs) return <p style={{ color: 'var(--text-secondary)' }}>Загрузка…</p>;
  if (logs.length === 0) return <p style={{ color: 'var(--text-secondary)' }}>Действий пока не зафиксировано.</p>;
  return (
    <div className="card" style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--text-secondary)' }}>
            <th style={{ padding: '0.4rem 0.6rem' }}>Когда</th>
            <th style={{ padding: '0.4rem 0.6rem' }}>Кто</th>
            <th style={{ padding: '0.4rem 0.6rem' }}>Метод</th>
            <th style={{ padding: '0.4rem 0.6rem' }}>Путь</th>
            <th style={{ padding: '0.4rem 0.6rem' }}>Код</th>
          </tr>
        </thead>
        <tbody>
          {logs.slice(0, 100).map((log) => (
            <tr key={log.id} style={{ borderTop: '1px solid var(--border)' }}>
              <td style={{ padding: '0.4rem 0.6rem', color: 'var(--text-secondary)' }}>
                {new Date(log.created_at).toLocaleString('ru-RU')}
              </td>
              <td style={{ padding: '0.4rem 0.6rem' }}>{log.user?.username || '—'}</td>
              <td style={{ padding: '0.4rem 0.6rem' }}>{log.method}</td>
              <td style={{ padding: '0.4rem 0.6rem', fontFamily: "'JetBrains Mono', monospace" }}>{log.path}</td>
              <td style={{ padding: '0.4rem 0.6rem', color: log.status_code >= 400 ? 'var(--danger)' : 'var(--accent)' }}>
                {log.status_code}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const EMPTY_BLOCK = { text: '', image: '' };

function NewsTab() {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [blocks, setBlocks] = useState([{ ...EMPTY_BLOCK }]);
  const [coverImage, setCoverImage] = useState('');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  // фотографии доступны для обложки только если их реально приложили к
  // какому-то блоку — отдельного поля "обложка" в форме больше нет
  const blockImages = blocks.map((b) => b.image.trim()).filter(Boolean);

  const updateBlock = (i, patch) => {
    setBlocks((list) => list.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  };

  const addBlock = () => {
    if (blocks.length >= 7) return;
    setBlocks((list) => [...list, { ...EMPTY_BLOCK }]);
  };

  const removeBlock = (i) => {
    if (blocks.length <= 1) return;
    const removedImage = blocks[i].image.trim();
    setBlocks((list) => list.filter((_, idx) => idx !== i));
    if (removedImage && removedImage === coverImage) setCoverImage('');
  };

  const submit = async (e) => {
    e.preventDefault();
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    if (tags.length > 2) {
      setStatus({ ok: false, text: 'Не больше 2 тегов на новость.' });
      return;
    }
    const cleanBlocks = blocks.map((b) => ({ text: b.text.trim(), image: b.image.trim() })).filter((b) => b.text);
    if (cleanBlocks.length === 0) {
      setStatus({ ok: false, text: 'Заполните текст хотя бы одного блока.' });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      await apiClient.post('/news/', {
        title,
        summary,
        cover_image: coverImage,
        blocks: cleanBlocks,
        tags,
      });
      setStatus({ ok: true, text: 'Новость опубликована.' });
      setTitle(''); setSummary(''); setTagsInput(''); setBlocks([{ ...EMPTY_BLOCK }]); setCoverImage('');
    } catch (err) {
      const data = err.response?.data;
      const text = data?.detail || data?.cover_image?.[0] || data?.blocks?.[0] || 'Не удалось опубликовать — проверьте поля или бэкенд.';
      setStatus({ ok: false, text });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card" style={{ maxWidth: 640 }}>
      <h3 style={{ marginTop: 0 }}>Опубликовать новость</h3>

      <div className="profile-field">
        <label>Заголовок</label>
        <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="profile-field">
        <label>Краткое описание для карточки ({summary.length}/280)</label>
        <input type="text" maxLength={280} required value={summary} onChange={(e) => setSummary(e.target.value)} />
      </div>
      <div className="profile-field">
        <label>Теги (через запятую, максимум 2)</label>
        <input
          type="text"
          placeholder="compiler, feature"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
        />
      </div>

      <div style={{ margin: '1.25rem 0 0.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <label style={{ fontWeight: 600 }}>Блоки статьи ({blocks.length}/7)</label>
        <button type="button" className="btn btn-secondary" disabled={blocks.length >= 7} onClick={addBlock}>
          + Добавить блок
        </button>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 0 }}>
        Каждый блок — кусок текста и, если нужно, фото к нему; на странице новости они
        выводятся попеременно слева/справа. Из всех приложенных фото ниже нужно выбрать
        одно для обложки в списке новостей.
      </p>

      {blocks.map((block, i) => (
        <div key={i} className="news-block-field">
          <div className="news-block-field__head">
            <span className="eyebrow">блок {i + 1}</span>
            {blocks.length > 1 && (
              <button type="button" className="news-block-field__remove" onClick={() => removeBlock(i)} title="Удалить блок">✕</button>
            )}
          </div>
          <textarea
            rows={3}
            placeholder="Текст блока…"
            value={block.text}
            onChange={(e) => updateBlock(i, { text: e.target.value })}
          />
          <input
            type="text"
            placeholder="URL фото к блоку (необязательно)"
            value={block.image}
            onChange={(e) => updateBlock(i, { image: e.target.value })}
          />
        </div>
      ))}

      {blockImages.length > 0 && (
        <div className="profile-field" style={{ marginTop: '1rem' }}>
          <label>Обложка для карточки новости</label>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0 0 0.5rem' }}>
            Лучше всего на карточке смотрится горизонтальное фото (шире, чем выше) — оно
            не обрезается грубо при масштабировании. Квадратные и вертикальные фото тоже
            подойдут, но часть кадра по краям может срезаться.
          </p>
          <div className="news-cover-picker">
            {blockImages.map((img) => (
              <button
                type="button"
                key={img}
                className={`news-cover-picker__thumb ${coverImage === img ? 'news-cover-picker__thumb--active' : ''}`}
                style={{ backgroundImage: `url(${img})` }}
                onClick={() => setCoverImage(coverImage === img ? '' : img)}
                title={coverImage === img ? 'Убрать как обложку' : 'Сделать обложкой'}
              />
            ))}
          </div>
        </div>
      )}

      {status && (
        <p style={{ color: status.ok ? 'var(--accent)' : 'var(--danger)', fontSize: '0.85rem' }}>{status.text}</p>
      )}
      <button className="btn btn-primary" disabled={busy}>
        {busy ? <span className="skeleton-spin" /> : 'Опубликовать'}
      </button>
    </form>
  );
}

function TeamTab({ developers, onChanged }) {
  const [promoteUsername, setPromoteUsername] = useState('');
  const [promoteLevel, setPromoteLevel] = useState('junior');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const changeLevel = async (key, level) => {
    setBusy(true);
    try {
      await apiClient.patch(`/auth/developers/${key}/level/`, { developer_level: level });
      onChanged();
    } catch {
      setStatus({ ok: false, text: 'Не удалось сменить уровень.' });
    } finally {
      setBusy(false);
    }
  };

  const promote = async (e) => {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      await apiClient.post('/auth/developers/promote/', { username: promoteUsername, developer_level: promoteLevel });
      setStatus({ ok: true, text: `${promoteUsername} теперь разработчик.` });
      setPromoteUsername('');
      onChanged();
    } catch (err) {
      setStatus({ ok: false, text: err.response?.data?.username?.[0] || 'Не удалось повысить пользователя.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <form onSubmit={promote} className="card" style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ marginTop: 0 }}>Зарегистрировать разработчика</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Повышает уже существующего участника сообщества до разработчика языка.
        </p>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            required
            placeholder="имя пользователя"
            value={promoteUsername}
            onChange={(e) => setPromoteUsername(e.target.value)}
            style={{ flex: 1, minWidth: 180 }}
          />
          <select value={promoteLevel} onChange={(e) => setPromoteLevel(e.target.value)}>
            {Object.entries(LEVEL_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button className="btn btn-primary" disabled={busy}>Повысить</button>
        </div>
        {status && (
          <p style={{ marginTop: '0.6rem', color: status.ok ? 'var(--accent)' : 'var(--danger)', fontSize: '0.85rem' }}>
            {status.text}
          </p>
        )}
      </form>

      <div className="card-grid">
        {developers && developers.map((d) => (
          <div key={d.id} className="card">
            <strong>{d.username}</strong>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.3rem 0 0.6rem' }}>
              {d.developer_key}
            </div>
            <select
              value={d.developer_level || 'junior'}
              disabled={busy}
              onChange={(e) => changeLevel(d.developer_key, e.target.value)}
            >
              {Object.entries(LEVEL_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

function SupportQueueTab() {
  const [sessions, setSessions] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const wsRef = useRef(null);

  const load = () => {
    apiClient.get('/support/sessions/')
      .then(({ data }) => setSessions((Array.isArray(data) ? data : data.results || []).filter((s) => s.status !== 'closed')))
      .catch(() => setSessions([]));
  };

  useEffect(() => {
    load();
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const token = localStorage.getItem('atm-access-token') || '';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/chat/queue/?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;
    ws.onmessage = () => load();
    return () => ws.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const claim = async (id) => {
    setBusyId(id);
    try {
      await apiClient.post(`/support/sessions/${id}/claim/`);
      setActiveId(id);
      load();
    } catch (err) {
      window.alert(err.response?.data?.detail || 'Не удалось подключиться к чату.');
    } finally {
      setBusyId(null);
    }
  };

  if (sessions === null) return <p style={{ color: 'var(--text-secondary)' }}>Загрузка…</p>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.25rem', alignItems: 'start' }}>
      <div className="card" style={{ padding: '0.5rem' }}>
        {sessions.length === 0 && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '0.75rem' }}>
            Очередь пуста — нет активных обращений.
          </p>
        )}
        {sessions.map((s) => (
          <div
            key={s.id}
            className={`tree-node ${activeId === s.id ? 'active' : ''}`}
            style={{ cursor: 'pointer' }}
            onClick={() => (s.developer ? setActiveId(s.id) : null)}
          >
            <span>{s.status === 'waiting_developer' ? '🟠' : s.status === 'with_developer' ? '🟢' : '🤖'}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>@{s.user?.username}</span>
            {!s.developer && s.status !== 'ai' && (
              <button className="ide__icon-btn" disabled={busyId === s.id} onClick={(e) => { e.stopPropagation(); claim(s.id); }}>
                Взять
              </button>
            )}
            {s.developer && s.developer.id !== undefined && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{s.developer.username}</span>
            )}
          </div>
        ))}
      </div>
      <div className="card chat-panel__inner" style={{ height: 480, padding: 0 }}>
        {activeId ? (
          <ChatPanel sessionId={activeId} asDeveloper />
        ) : (
          <p style={{ color: 'var(--text-secondary)', padding: '1rem' }}>
            Выберите обращение слева (или нажмите «Взять», если оно ещё в очереди).
          </p>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState(null);
  const [developers, setDevelopers] = useState(null);

  const loadDevelopers = () => {
    apiClient.get('/auth/developers/').then(({ data }) => setDevelopers(data)).catch(() => setDevelopers([]));
  };

  useEffect(() => {
    if (!user?.is_developer) return;
    apiClient.get('/logs/stats/').then(({ data }) => setStats(data)).catch(() => {});
    apiClient.get('/logs/').then(({ data }) => setLogs(Array.isArray(data) ? data : data.results || [])).catch(() => setLogs([]));
    if (user.is_senior_plus) loadDevelopers();
  }, [user]);

  if (loading) return null;

  if (!user?.is_developer) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <h2>Доступ только для команды ATOM</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Эта страница видна только разработчикам языка.</p>
        <Link to="/" className="btn btn-primary">На главную</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="eyebrow">панель команды</div>
      <h1 style={{ marginTop: 0 }}>Админка</h1>

      <div className="profile-tabs" style={{ marginBottom: '1.25rem' }}>
        <div className={`profile-tab ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')}>
          Аналитика
        </div>
        <div className={`profile-tab ${tab === 'logs' ? 'active' : ''}`} onClick={() => setTab('logs')}>
          Журнал действий
        </div>
        {user.is_middle_plus && (
          <div className={`profile-tab ${tab === 'news' ? 'active' : ''}`} onClick={() => setTab('news')}>
            Новости
          </div>
        )}
        {user.is_middle_plus && (
          <div className={`profile-tab ${tab === 'support' ? 'active' : ''}`} onClick={() => setTab('support')}>
            Очередь поддержки
          </div>
        )}
        {user.is_senior_plus && (
          <div className={`profile-tab ${tab === 'team' ? 'active' : ''}`} onClick={() => setTab('team')}>
            Команда
          </div>
        )}
      </div>

      {tab === 'stats' && <StatsTab stats={stats} />}
      {tab === 'logs' && <LogsTab logs={logs} />}
      {tab === 'news' && user.is_middle_plus && <NewsTab />}
      {tab === 'support' && user.is_middle_plus && <SupportQueueTab />}
      {tab === 'team' && user.is_senior_plus && <TeamTab developers={developers} onChanged={loadDevelopers} />}
    </div>
  );
}
