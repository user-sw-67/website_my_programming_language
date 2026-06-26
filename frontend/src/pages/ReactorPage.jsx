import React, { useEffect, useState } from 'react';
import apiClient from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import Pagination from '../components/Pagination.jsx';
import ReactorRailList from '../components/ReactorRailList.jsx';
import ReactorWordmark from '../components/ReactorWordmark.jsx';
import TerminalDropdown from '../components/TerminalDropdown.jsx';
import TerminalMultiSelect from '../components/TerminalMultiSelect.jsx';
import '../styles/reactor.css';

const DEMO_TOPICS = [
  { id: 'demo-1', slug: 'demo-1', title: 'Как объявить вариативную функцию?', summary: 'Пробую написать func sum(...nums) — компилятор ругается.', tags: ['func', 'args'], comments_count: 2, is_resolved: true, avg_rating: 4.5, ratings_count: 2, author: { username: 'guest_dev' } },
  { id: 'demo-2', slug: 'demo-2', title: 'Почему auto не ловит ошибку типа в рантайме?', summary: 'Динамика в gradual typing — ожидаемое поведение или баг?', tags: ['typing', 'gradual'], comments_count: 1, is_resolved: false, avg_rating: 0, ratings_count: 0, author: { username: 'guest_dev' } },
  { id: 'demo-3', slug: 'demo-3', title: 'Наследование классов и метод new()', summary: 'Как правильно вызывать родительский конструктор?', tags: ['classes', 'oop'], comments_count: 3, is_resolved: true, avg_rating: 5, ratings_count: 1, author: { username: 'mercedessupov' } },
  { id: 'demo-4', slug: 'demo-4', title: 'Импорт модуля @array не резолвится', summary: 'use "@array"; падает с ошибкой разрешения модуля.', tags: ['modules', 'bug'], comments_count: 0, is_resolved: false, avg_rating: 0, ratings_count: 0, author: { username: 'mercedessupov' } },
];

const SORT_OPTIONS = [
  { value: '', label: 'Новые', icon: '🆕' },
  { value: 'oldest', label: 'Старые', icon: '🕰️' },
  { value: 'top_rated', label: 'Высокий рейтинг', icon: '⭐' },
  { value: 'most_discussed', label: 'Обсуждаемые', icon: '💬' },
];

const RESOLVED_OPTIONS = [
  { value: '', label: 'Без разницы', icon: '∗' },
  { value: 'true', label: 'Решено', icon: '✅' },
  { value: 'false', label: 'Не решено', icon: '🟡' },
];

/** Переключатель «Мои / Все» в терминальном виде (вариант Б из лаборатории
 * /lab-reactor) — теперь настоящие кнопки с рамкой и фоном (раньше были
 * безрамочным текстом, поэтому терялись на странице), курсор `_` стоит
 * у активной вкладки. Видим всегда, включая гостей — кнопка «мои» просто
 * отключена с подсказкой войти, как и остальные auth-зависимые элементы сайта. */
function MineAllToggle({ mine, onChange, disabled }) {
  return (
    <div className="reactor-mine-toggle">
      <button type="button" className={!mine ? 'active' : ''} onClick={() => onChange(false)}>
        [ все ]{!mine && <span className="reactor-mine-toggle__cursor">_</span>}
      </button>
      <button
        type="button"
        className={mine ? 'active' : ''}
        disabled={disabled}
        title={disabled ? 'Войдите, чтобы смотреть только свои посты' : undefined}
        onClick={() => onChange(true)}
      >
        [ мои ]{mine && <span className="reactor-mine-toggle__cursor">_</span>}
      </button>
    </div>
  );
}

export default function ReactorPage() {
  const { user } = useAuth();
  const [topics, setTopics] = useState(null);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sort, setSort] = useState('');
  const [mineOnly, setMineOnly] = useState(false);
  const [resolved, setResolved] = useState('');

  const toggleTag = (t) => {
    setSelectedTags((list) => (
      list.includes(t) ? list.filter((x) => x !== t) : list.length < 5 ? [...list, t] : list
    ));
  };

  useEffect(() => {
    apiClient.get('/forum/categories/').then(({ data }) => setCategories(Array.isArray(data) ? data : data.results || [])).catch(() => {});
  }, []);

  useEffect(() => {
    apiClient.get('/forum/topics/', { params: { page_size: 100 } })
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data.results || [];
        const counts = new Map();
        list.forEach((t) => (t.tags || []).forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1)));
        setAllTags([...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const params = { page };
      if (search) params.search = search;
      if (selectedTags.length) params.tags = selectedTags.join(',');
      if (selectedCategory) params.category = selectedCategory;
      if (sort) params.sort = sort;
      if (resolved) params.resolved = resolved;
      if (mineOnly && user) params.mine = 'true';
      apiClient.get('/forum/topics/', { params })
        .then(({ data }) => {
          if (Array.isArray(data)) {
            setTopics(data);
            setCount(data.length);
          } else {
            setTopics(data.results || []);
            setCount(data.count || 0);
          }
        })
        .catch(() => {
          setTopics(DEMO_TOPICS);
          setCount(DEMO_TOPICS.length);
        });
    }, 250);
    return () => clearTimeout(t);
  }, [search, selectedTags, selectedCategory, sort, resolved, mineOnly, page, user]);

  useEffect(() => { setPage(1); }, [search, selectedTags, selectedCategory, sort, resolved, mineOnly]);

  const totalPages = Math.max(1, Math.ceil(count / 20));

  return (
    <div>
      <div className="eyebrow">// зона синтеза идей сообщества</div>
      <h1 style={{ marginTop: 0, marginBottom: '0.4rem' }}><ReactorWordmark size="2.1rem" /></h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: 640, marginTop: 0 }}>
        «Реактор» — место, где вопросы и наблюдения сообщества вступают в реакцию с
        опытом разработчиков и пользователей языка: задавайте вопросы, делитесь кодом
        и наблюдениями, получайте обратную связь и оценивайте лучшие посты звёздами.
      </p>

      <div className="reactor-console">
        <div className="reactor-console__row">
          <span className="reactor-console__prompt">grep -i</span>
          <input
            type="text"
            className="reactor-console__input"
            placeholder="название, тема, автор…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <TerminalDropdown prefix="--sort" value={sort} options={SORT_OPTIONS} onChange={setSort} />
        </div>
        <div className="reactor-console__row reactor-console__row--secondary">
          <span className="reactor-console__prompt">--scope</span>
          <MineAllToggle mine={mineOnly} onChange={setMineOnly} disabled={!user} />
          <TerminalDropdown prefix="--resolved" value={resolved} options={RESOLVED_OPTIONS} onChange={setResolved} />
          {categories.length > 0 && (
            <TerminalDropdown
              prefix="--category"
              value={selectedCategory}
              options={[{ value: '', label: 'Все категории', icon: '🗂️' }, ...categories.map((c) => ({ value: c.slug, label: c.name, icon: '📁' }))]}
              onChange={setSelectedCategory}
            />
          )}
          {allTags.length > 0 && (
            <TerminalMultiSelect prefix="--tags" selected={selectedTags} options={allTags} onToggle={toggleTag} max={5} />
          )}
          {selectedTags.length > 0 && (
            <div className="reactor-console__chips">
              {selectedTags.map((t) => (
                <span key={t} className="badge reactor-console__chip-removable">
                  #{t}
                  <button type="button" onClick={() => toggleTag(t)} aria-label={`Убрать тег ${t}`}>✕</button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {topics === null && <p style={{ color: 'var(--text-secondary)' }}>Загрузка…</p>}
      {topics && topics.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Ничего не нашлось.</p>}

      {topics && topics.length > 0 && <ReactorRailList topics={topics} />}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} className="reactor-pagination-terminal" />
    </div>
  );
}
