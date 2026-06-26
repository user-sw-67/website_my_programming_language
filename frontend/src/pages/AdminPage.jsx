import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import ChatPanel from '../components/ChatPanel.jsx';
import ChatTranscript from '../components/ChatTranscript.jsx';
import Avatar from '../components/Avatar.jsx';
import ReactorWordmark from '../components/ReactorWordmark.jsx';
import { displayName } from '../utils/userDisplay.js';
import { useToast } from '../ui/FeedbackContext.jsx';
import '../styles/admin.css';

const LEVEL_LABEL = { junior: 'Junior', middle: 'Middle', senior: 'Senior' };
const ROLE_LABEL = { member: 'Участники', developer: 'Разработчики', admin: 'Администраторы' };

const LEVEL_HINT = {
  junior: 'Junior: только просматривает контент и отвечает на отзывы пользователей.',
  middle: 'Middle: то же, что junior, плюс публикует новости и отвечает в чате поддержки.',
  senior: 'Senior: то же, что middle, плюс меняет уровни других разработчиков и видит расширенную админку (команда, завершённые обращения).',
};

const ROLE_HINT = {
  member: 'Обычные участники сообщества — не разработчики языка, доступ только к публичным разделам сайта.',
  developer: 'Все разработчики языка любого уровня (junior/middle/senior) — у них есть доступ к этой админке.',
  admin: 'Администраторы — равносильны senior везде на сайте, плюс доступ к служебной Django admin (/admin/).',
};

const OVERVIEW_CARDS = [
  { key: 'users_total', label: 'Пользователей всего', hint: 'Все зарегистрированные аккаунты на платформе: участники, разработчики и администраторы вместе.' },
  { key: 'projects_total', label: 'Проектов пользователей', hint: 'Количество проектов, созданных в редакторе авторизованными пользователями (включая пустые и черновики).' },
  { key: 'forum_topics_total', label: <>Постов в <ReactorWordmark variant="plain" /></>, hint: 'Все посты в разделе «Реактор», когда-либо созданные пользователями, независимо от статуса решения.' },
  { key: 'news_total', label: 'Новостей опубликовано', hint: 'Сколько новостей команда выпустила за всё время — все опубликованные посты в разделе «Новости».' },
];

const ATTENTION_CARDS = [
  { key: 'feedback_unanswered', label: 'Отзывов без ответа', tone: 'warn', hint: 'Отзывы и предложения пользователей, на которые пока не ответил ни один разработчик. Ответить может джуниор и выше.' },
  { key: 'forum_topics_unresolved', label: <>Нерешённых постов в <ReactorWordmark variant="plain" /></>, tone: 'warn', hint: 'Посты в Реакторе, которые автор ещё не отметил как решённые — потенциально требуют внимания.' },
  { key: 'issues_open', label: 'Открытых проблем', tone: 'danger', hint: 'Баги и проблемы со статусом «Открыта» в разделе «Проблемы» — ещё не исправлены и не закрыты.' },
  { key: 'support_sessions_waiting', label: 'Ждут разработчика в поддержке', tone: 'danger', hint: 'Обращения в чат поддержки, которые пользователь передал разработчику, но никто пока не взял в работу.' },
];

const SUPPORT_CARDS = [
  { key: 'support_sessions_active', label: 'Активных обращений', hint: 'Все незакрытые разговоры в чате поддержки: с ИИ-ботом, в очереди ожидания и уже с разработчиком.' },
  { key: 'support_sessions_closed', label: 'Завершённых обращений', hint: 'Сколько обращений в поддержку за всё время было закрыто — пользователем или разработчиком.' },
];

function StatCard({ keyName, label, tone, value, hint }) {
  return (
    <div className={`card stat-card ${tone ? `stat-card--${tone}` : ''}`} key={keyName} tabIndex={hint ? 0 : undefined}>
      <div className="stat-card__value">{value ?? '—'}</div>
      <div className="stat-card__label">{label}</div>
      {hint && (
        <div className="stat-card__tooltip">
          <span className="stat-card__tooltip-arrow" />
          {hint}
        </div>
      )}
    </div>
  );
}

function BreakdownRow({ label, value, hint }) {
  return (
    <div className="stat-breakdown-row" tabIndex={hint ? 0 : undefined}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <strong>{value}</strong>
      {hint && (
        <div className="stat-card__tooltip">
          <span className="stat-card__tooltip-arrow" />
          {hint}
        </div>
      )}
    </div>
  );
}

function StatsTab({ stats }) {
  if (!stats) return <p style={{ color: 'var(--text-secondary)' }}>Загрузка…</p>;
  return (
    <div>
      <div className="admin-stats-section">
        <div className="admin-stats-section__title">обзор платформы</div>
        <div className="card-grid">
          {OVERVIEW_CARDS.map((c) => <StatCard key={c.key} keyName={c.key} label={c.label} hint={c.hint} value={stats[c.key]} />)}
        </div>
      </div>

      <div className="admin-stats-section">
        <div className="admin-stats-section__title">требует внимания команды</div>
        <div className="card-grid">
          {ATTENTION_CARDS.map((c) => <StatCard key={c.key} keyName={c.key} label={c.label} tone={c.tone} hint={c.hint} value={stats[c.key]} />)}
        </div>
      </div>

      <div className="admin-stats-section">
        <div className="admin-stats-section__title">чат поддержки</div>
        <div className="card-grid">
          {SUPPORT_CARDS.map((c) => <StatCard key={c.key} keyName={c.key} label={c.label} hint={c.hint} value={stats[c.key]} />)}
        </div>
      </div>

      <div className="admin-stats-section">
        <div className="admin-stats-section__title">команда разработчиков</div>
        <div className="card-grid">
          <div className="card">
            <div className="eyebrow" style={{ marginBottom: '0.5rem' }}>по уровню</div>
            {Object.entries(stats.developers_by_level).map(([level, count]) => (
              <BreakdownRow key={level} label={LEVEL_LABEL[level]} value={count} hint={LEVEL_HINT[level]} />
            ))}
          </div>
          <div className="card">
            <div className="eyebrow" style={{ marginBottom: '0.5rem' }}>по роли</div>
            {Object.entries(stats.users_by_role || {}).map(([role, count]) => (
              <BreakdownRow key={role} label={ROLE_LABEL[role] || role} value={count} hint={ROLE_HINT[role]} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LogsTab({ logs }) {
  if (!logs) return <p style={{ color: 'var(--text-secondary)' }}>Загрузка…</p>;
  if (logs.length === 0) return <p style={{ color: 'var(--text-secondary)' }}>Действий пока не зафиксировано.</p>;
  return (
    <div className="card admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Когда</th>
            <th>Кто</th>
            <th>Метод</th>
            <th>Путь</th>
            <th>Код</th>
          </tr>
        </thead>
        <tbody>
          {logs.slice(0, 100).map((log) => (
            <tr key={log.id}>
              <td style={{ color: 'var(--text-secondary)' }}>
                {new Date(log.created_at).toLocaleString('ru-RU')}
              </td>
              <td>{log.user ? displayName(log.user) : '—'}</td>
              <td><span className="admin-table__method">{log.method}</span></td>
              <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>{log.path}</td>
              <td className={log.status_code >= 400 ? 'admin-table__code--err' : 'admin-table__code--ok'}>
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

function BlockImageInput({ image, onChange }) {
  const [mode, setMode] = useState('url');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const onFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('image', file);
      const { data } = await apiClient.post('/news/upload-image/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onChange(data.url);
    } catch (err) {
      setError(err.response?.data?.image?.[0] || 'Не удалось загрузить файл.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="news-image-input">
      <div className="news-image-input__tabs">
        <button
          type="button"
          className={`news-image-input__tab ${mode === 'url' ? 'news-image-input__tab--active' : ''}`}
          onClick={() => setMode('url')}
        >
          Ссылка
        </button>
        <button
          type="button"
          className={`news-image-input__tab ${mode === 'file' ? 'news-image-input__tab--active' : ''}`}
          onClick={() => setMode('file')}
        >
          Загрузить файл
        </button>
      </div>

      {mode === 'url' ? (
        <input
          type="text"
          placeholder="URL фото к блоку (необязательно)"
          value={image}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <label className="news-image-input__dropzone">
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => onFile(e.target.files?.[0])} />
          {uploading ? 'Загрузка…' : 'Нажмите, чтобы выбрать файл (до 5 МБ)'}
        </label>
      )}
      {error && <p style={{ color: 'var(--danger)', fontSize: '0.78rem', margin: 0 }}>{error}</p>}
      {image && <div className="news-image-input__preview" style={{ backgroundImage: `url(${image})` }} />}
    </div>
  );
}

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
    <form onSubmit={submit} className="card" style={{ maxWidth: 760 }}>
      <div className="eyebrow">команда атом · новости</div>
      <h3 style={{ marginTop: 0 }}>Опубликовать новость</h3>

      <div className="news-form-grid">
        <div className="profile-field">
          <label>Заголовок</label>
          <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} />
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
      </div>
      <div className="profile-field">
        <label>Краткое описание для карточки ({summary.length}/280)</label>
        <input type="text" maxLength={280} required value={summary} onChange={(e) => setSummary(e.target.value)} />
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
          <BlockImageInput image={block.image} onChange={(image) => updateBlock(i, { image })} />
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

/** Подраздел 1 — регистрация нового разработчика (повышение участника
 * сообщества). Поиск по имени/email через /auth/members/, своё локальное
 * состояние формы — не пересекается со сменой уровня уже действующих
 * разработчиков (это отдельный подраздел, см. DeveloperSearchSubtab). */
function AddDeveloperSubtab({ onChanged }) {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState([]);
  const [searched, setSearched] = useState(false);
  const [picked, setPicked] = useState(null);
  const [promoteLevel, setPromoteLevel] = useState('junior');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const searchTimer = useRef(null);

  const onQueryChange = (value) => {
    setQuery(value);
    setPicked(null);
    setSearched(false);
    clearTimeout(searchTimer.current);
    if (value.trim().length < 2) {
      setMatches([]);
      return;
    }
    searchTimer.current = setTimeout(() => {
      apiClient.get('/auth/members/', { params: { search: value.trim() } })
        .then(({ data }) => setMatches(Array.isArray(data) ? data : data.results || []))
        .catch(() => setMatches([]))
        .finally(() => setSearched(true));
    }, 300);
  };

  const pick = (member) => {
    setPicked(member);
    setQuery(member.username);
    setMatches([]);
  };

  const promote = async (e) => {
    e.preventDefault();
    if (!picked) {
      setStatus({ ok: false, text: 'Выберите участника из выпадающего списка.' });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      await apiClient.post('/auth/developers/promote/', { username: picked.username, developer_level: promoteLevel });
      setStatus({ ok: true, text: `${picked.username} теперь разработчик.` });
      setQuery('');
      setPicked(null);
      onChanged();
    } catch (err) {
      setStatus({ ok: false, text: err.response?.data?.username?.[0] || 'Не удалось повысить пользователя.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={promote} className="card">
      <h3 style={{ marginTop: 0 }}>Зарегистрировать разработчика</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
        Найдите уже зарегистрированного участника сообщества по имени или email и повысьте его до разработчика языка.
      </p>
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="member-search" style={{ flex: 1, minWidth: 220, position: 'relative' }}>
          <input
            type="text"
            required
            placeholder="имя пользователя или email…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onBlur={() => setTimeout(() => setMatches([]), 150)}
            autoComplete="off"
          />
          {(matches.length > 0 || (searched && query.trim().length >= 2 && !picked)) && (
            <div className="member-search__dropdown">
              {matches.length === 0 ? (
                <div className="member-search__empty">Совпадений не найдено</div>
              ) : (
                matches.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    className="member-search__option"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(m)}
                  >
                    <Avatar user={m} size={26} />
                    <div className="member-search__option-text">
                      <strong>{displayName(m)}</strong>
                      <span>@{m.username}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <select value={promoteLevel} onChange={(e) => setPromoteLevel(e.target.value)}>
          {Object.entries(LEVEL_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button className="btn btn-primary" disabled={busy || !picked}>Повысить</button>
      </div>
      {status && (
        <p style={{ marginTop: '0.6rem', color: status.ok ? 'var(--accent)' : 'var(--danger)', fontSize: '0.85rem' }}>
          {status.text}
        </p>
      )}
    </form>
  );
}

/** Подраздел 2 — поиск среди уже действующих разработчиков по логину, имени
 * или уникальному developer_key, со сменой уровня прямо в карточке найденного
 * (фильтрация клиентская — список разработчиков на сайте небольшой, грузится
 * один раз в AdminPage, лишние запросы к серверу не нужны). */
function DeveloperSearchSubtab({ developers, busy, onChangeLevel }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const filtered = !developers ? null : (
    !q ? developers : developers.filter((d) => (
      d.username.toLowerCase().includes(q)
      || (d.display_name || '').toLowerCase().includes(q)
      || (d.developer_key || '').toLowerCase().includes(q)
    ))
  );

  return (
    <div>
      <div className="profile-field" style={{ maxWidth: 420, marginBottom: '1.1rem' }}>
        <label>Поиск по логину, имени или ключу разработчика</label>
        <input
          type="text"
          placeholder="ATM-XXXXXXXX, имя или @логин…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
      </div>

      {filtered === null && <p style={{ color: 'var(--text-secondary)' }}>Загрузка…</p>}
      {filtered && filtered.length === 0 && (
        <p style={{ color: 'var(--text-secondary)' }}>Никого не нашли по этому запросу.</p>
      )}
      <div className="card-grid">
        {filtered && filtered.map((d) => (
          <div key={d.id} className="card team-dev-card">
            <Avatar user={d} size={32} />
            <strong>{displayName(d)}</strong>
            <div className="team-dev-card__key">@{d.username} · {d.developer_key}</div>
            <select
              value={d.developer_level || 'junior'}
              disabled={busy}
              onChange={(e) => onChangeLevel(d.developer_key, e.target.value)}
            >
              {Object.entries(LEVEL_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamTab({ developers, onChanged }) {
  const [subtab, setSubtab] = useState('add'); // 'add' | 'search'
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  const changeLevel = async (key, level) => {
    setBusy(true);
    setStatus(null);
    try {
      await apiClient.patch(`/auth/developers/${key}/level/`, { developer_level: level });
      onChanged();
    } catch {
      setStatus({ ok: false, text: 'Не удалось сменить уровень.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="profile-tabs" style={{ marginBottom: '1.1rem' }}>
        <div className={`profile-tab ${subtab === 'add' ? 'active' : ''}`} onClick={() => setSubtab('add')}>
          Добавить разработчика
        </div>
        <div className={`profile-tab ${subtab === 'search' ? 'active' : ''}`} onClick={() => setSubtab('search')}>
          Поиск разработчиков
        </div>
      </div>

      {subtab === 'add' && <AddDeveloperSubtab onChanged={onChanged} />}
      {subtab === 'search' && (
        <>
          <DeveloperSearchSubtab developers={developers} busy={busy} onChangeLevel={changeLevel} />
          {status && (
            <p style={{ marginTop: '0.6rem', color: status.ok ? 'var(--accent)' : 'var(--danger)', fontSize: '0.85rem' }}>
              {status.text}
            </p>
          )}
        </>
      )}
    </div>
  );
}

const CATEGORY_LABEL = {
  question: 'Вопрос',
  site_broken: 'Не работает сайт',
  language_bug: 'Баг в языке',
  critical: 'Критично',
};

// зеркало backend-логики ChatSession.priority_score (apps/support_chat/models.py) —
// нужно, чтобы разложить итоговое число на составляющие для тултипа без
// отдельного запроса к серверу; если формулу там поменяют, поменять и тут
const CATEGORY_WEIGHT = { question: 1, site_broken: 2, language_bug: 2, critical: 3 };

function priorityBreakdown(s) {
  const weight = CATEGORY_WEIGHT[s.category] ?? 1;
  let waitMinutes = 0;
  let waitBonus = 0;
  if (s.waiting_since) {
    waitMinutes = Math.floor((Date.now() - new Date(s.waiting_since).getTime()) / 60000);
    waitBonus = waitMinutes >= 15 ? 2 : waitMinutes >= 5 ? 1 : 0;
  }
  const aiBonus = Math.max(0, (s.priority_score ?? 0) - weight - waitBonus);
  return { weight, waitMinutes, waitBonus, aiBonus, score: s.priority_score };
}

function PriorityBadge({ session }) {
  const score = session.priority_score;
  if (score === undefined || score === null) return null;
  const tone = score >= 5 ? 'danger' : score >= 3 ? 'warn' : 'ok';
  const b = priorityBreakdown(session);
  return (
    <span className={`priority-badge priority-badge--${tone}`} tabIndex={0}>
      {score}
      <div className="stat-card__tooltip">
        <span className="stat-card__tooltip-arrow" />
        <div className="priority-breakdown__row">
          <span>Категория «{CATEGORY_LABEL[session.category] || session.category}»</span>
          <strong>+{b.weight}</strong>
        </div>
        <div className="priority-breakdown__row">
          <span>Ожидание {b.waitMinutes > 0 ? `${b.waitMinutes} мин` : 'только начато'}</span>
          <strong>+{b.waitBonus}</strong>
        </div>
        <div className="priority-breakdown__row">
          <span>Сложность диалога с ИИ</span>
          <strong>+{b.aiBonus}</strong>
        </div>
        <div className="priority-breakdown__total">
          <span>Итого</span>
          <span>{b.score}</span>
        </div>
      </div>
    </span>
  );
}

function SupportQueueList({ sessions, activeId, onSelect, currentUser, onClaim, busyId }) {
  if (sessions.length === 0) {
    return (
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '0.75rem' }}>
        Очередь пуста — нет обращений, ожидающих разработчика.
      </p>
    );
  }
  return sessions.map((s) => {
    const isOwnTicket = s.user?.id === currentUser?.id;
    return (
      <div
        key={s.id}
        className={`support-ticket ${activeId === s.id ? 'active' : ''}`}
        onClick={() => (s.developer ? onSelect(s.id) : null)}
      >
        <Avatar user={s.user} size={34} />
        <div className="support-ticket__body">
          <div className="support-ticket__name">
            <span className={`support-ticket__status-dot support-ticket__status-dot--${s.status === 'waiting_developer' ? 'waiting' : 'active'}`} />
            {s.user ? displayName(s.user) : '—'}{isOwnTicket && ' (вы)'}
          </div>
          <div className="support-ticket__meta">
            {CATEGORY_LABEL[s.category] || s.category}
            {s.developer && ` · ведёт ${displayName(s.developer)}`}
          </div>
        </div>
        <div className="support-ticket__side">
          <PriorityBadge session={s} />
          {!s.developer && !isOwnTicket && (
            <button className="support-claim-btn" disabled={busyId === s.id} onClick={(e) => { e.stopPropagation(); onClaim(s.id); }}>
              {busyId === s.id ? <span className="skeleton-spin" /> : '👋 Взять в работу'}
            </button>
          )}
        </div>
      </div>
    );
  });
}

function SupportQueueTab({ currentUser }) {
  const [subtab, setSubtab] = useState('queue'); // 'queue' | 'mine_closed'
  const [sessions, setSessions] = useState(null);
  const [closedSessions, setClosedSessions] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const wsRef = useRef(null);
  const toast = useToast();

  const load = () => {
    apiClient.get('/support/sessions/')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data.results || [];
        list.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
        setSessions(list);
      })
      .catch(() => setSessions([]));
  };

  const loadClosed = () => {
    apiClient.get('/support/sessions/?assigned=true&status=closed')
      .then(({ data }) => setClosedSessions(Array.isArray(data) ? data : data.results || []))
      .catch(() => setClosedSessions([]));
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

  useEffect(() => {
    if (subtab === 'mine_closed' && closedSessions === null) loadClosed();
  }, [subtab]); // eslint-disable-line react-hooks/exhaustive-deps

  const claim = async (id) => {
    setBusyId(id);
    try {
      await apiClient.post(`/support/sessions/${id}/claim/`);
      setActiveId(id);
      load();
    } catch (err) {
      toast({ text: err.response?.data?.detail || 'Не удалось подключиться к чату.', tone: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="profile-tabs" style={{ marginBottom: '1rem' }}>
        <div className={`profile-tab ${subtab === 'queue' ? 'active' : ''}`} onClick={() => { setSubtab('queue'); setActiveId(null); }}>
          Очередь
        </div>
        <div className={`profile-tab ${subtab === 'mine_closed' ? 'active' : ''}`} onClick={() => { setSubtab('mine_closed'); setActiveId(null); }}>
          Мои завершённые
        </div>
      </div>

      {subtab === 'queue' ? (
        sessions === null ? <p style={{ color: 'var(--text-secondary)' }}>Загрузка…</p> : (
          <div className="support-queue-grid">
            <div className="card" style={{ padding: '0.5rem' }}>
              <SupportQueueList sessions={sessions} activeId={activeId} onSelect={setActiveId} currentUser={currentUser} onClaim={claim} busyId={busyId} />
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
        )
      ) : (
        closedSessions === null ? <p style={{ color: 'var(--text-secondary)' }}>Загрузка…</p> : (
          <div className="support-queue-grid">
            <div className="card" style={{ padding: '0.5rem' }}>
              {closedSessions.length === 0 && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '0.75rem' }}>
                  Вы пока не завершили ни одного разговора.
                </p>
              )}
              {closedSessions.map((s) => (
                <div
                  key={s.id}
                  className={`support-ticket ${activeId === s.id ? 'active' : ''}`}
                  onClick={() => setActiveId(s.id)}
                >
                  <Avatar user={s.user} size={34} />
                  <div className="support-ticket__body">
                    <div className="support-ticket__name">
                      <span className="support-ticket__status-dot support-ticket__status-dot--closed" />
                      {s.user ? displayName(s.user) : '—'}
                    </div>
                    <div className="support-ticket__meta">{new Date(s.closed_at || s.created_at).toLocaleDateString('ru-RU')}</div>
                  </div>
                  <RatingTag rating={s.rating} review={s.review} />
                </div>
              ))}
            </div>
            <div className="card chat-panel__inner" style={{ height: 480, padding: 0 }}>
              {activeId ? (
                <ChatTranscript sessionId={activeId} />
              ) : (
                <p style={{ color: 'var(--text-secondary)', padding: '1rem' }}>
                  Выберите завершённый разговор слева, чтобы перечитать его.
                </p>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}

function RatingTag({ rating, review }) {
  if (!rating) return <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>без оценки</span>;
  return (
    <span className="rating-tag" title={review || 'Без отзыва'}>
      <span style={{ color: '#f59e0b' }}>{'★'.repeat(rating)}</span>
      {review && <span className="rating-tag__review">«{review.length > 40 ? `${review.slice(0, 40)}…` : review}»</span>}
    </span>
  );
}

function ClosedSessionsTab() {
  const [sessions, setSessions] = useState(null);
  const [channel, setChannel] = useState('ai'); // 'ai' | 'developer'
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    apiClient.get('/support/sessions/?status=closed')
      .then(({ data }) => setSessions(Array.isArray(data) ? data : data.results || []))
      .catch(() => setSessions([]));
  }, []);

  if (sessions === null) return <p style={{ color: 'var(--text-secondary)' }}>Загрузка…</p>;

  // разделение нужно, чтобы можно было отдельно анализировать качество
  // ИИ-бота (разговоры без участия разработчика) от обращений, которые
  // реально дошли до живого человека — запрос пользователя проекта
  const filtered = sessions.filter((s) => (channel === 'ai' ? !s.developer : !!s.developer));
  const active = filtered.find((s) => s.id === activeId);

  return (
    <div>
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
          {filtered.length === 0 && (
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
              <Avatar user={s.user} size={34} />
              <div className="support-ticket__body">
                <div className="support-ticket__name">
                  <span className="support-ticket__status-dot support-ticket__status-dot--closed" />
                  {s.user ? displayName(s.user) : '—'}
                </div>
                {s.developer && <div className="support-ticket__meta">ведёт {displayName(s.developer)}</div>}
              </div>
              <RatingTag rating={s.rating} review={s.review} />
            </div>
          ))}
        </div>
        <div className="card chat-panel__inner" style={{ height: 480, padding: 0 }}>
          {active ? (
            <ChatTranscript sessionId={active.id} />
          ) : (
            <p style={{ color: 'var(--text-secondary)', padding: '1rem' }}>
              Выберите завершённый разговор слева, чтобы перечитать его.
            </p>
          )}
        </div>
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
      <div className="admin-header">
        <div>
          <div className="eyebrow">панель команды</div>
          <h1 style={{ marginTop: 0, marginBottom: 0 }}>Центр управления</h1>
        </div>
        <span className="admin-header__badge">
          {user.developer_key} · {user.is_senior_plus ? 'Senior' : user.is_middle_plus ? 'Middle' : 'Junior'}
        </span>
      </div>

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
          <div className={`profile-tab ${tab === 'closed' ? 'active' : ''}`} onClick={() => setTab('closed')}>
            Завершённые
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
      {tab === 'support' && user.is_middle_plus && <SupportQueueTab currentUser={user} />}
      {tab === 'closed' && user.is_senior_plus && <ClosedSessionsTab />}
      {tab === 'team' && user.is_senior_plus && <TeamTab developers={developers} onChanged={loadDevelopers} />}
    </div>
  );
}
