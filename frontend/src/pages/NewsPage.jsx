import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client.js';
import Pagination from '../components/Pagination.jsx';
import { useMediaQuery } from '../hooks/useMediaQuery.js';
import { displayName } from '../utils/userDisplay.js';
import '../styles/news.css';

const DEMO_NEWS = [
  {
    id: 'demo-1', slug: 'demo-1', published_at: '2026-06-20', title: 'Семантический анализ: добавлен третий проход OptimizationVisitor',
    summary: 'Свёртка констант теперь работает для бинарных операций с литералами.',
    body: 'Свёртка констант теперь работает для бинарных операций с литералами.',
    tags: ['compiler', 'optimization'], cover_image: 'https://picsum.photos/seed/atom-optimizer/800/450',
    author: { username: 'mercedessupov' },
  },
  {
    id: 'demo-2', slug: 'demo-2', published_at: '2026-06-17', title: 'Расширение для VS Code',
    summary: 'Опубликован .vsix с подсветкой синтаксиса ATOM.',
    body: 'Опубликован .vsix с подсветкой синтаксиса ATOM.',
    tags: ['tooling', 'vscode'], cover_image: 'https://picsum.photos/seed/atom-vscode/800/450',
    author: { username: 'mercedessupov' },
  },
  {
    id: 'demo-3', slug: 'demo-3', published_at: '2026-06-12', title: 'Старт веб-платформы',
    summary: 'Начата разработка сайта: редактор кода, форум, документация.',
    body: 'Начата разработка сайта: редактор кода, форум, документация.',
    tags: ['platform', 'announcement'], cover_image: 'https://picsum.photos/seed/atom-platform/800/450',
    author: { username: 'mercedessupov' },
  },
];

// Раскладка ленты — явная геометрия, а не надежда на авто-расстановку
// грида. Главная страница ленты почти всегда получает ровно 10 новостей
// (page_size на бэкенде), но последняя страница поиска/фильтра может
// прийти с ЛЮБЫМ числом от 1 до 10 — поэтому под каждое количество заведён
// отдельный, руками подобранный шаблон, который сам по себе складывается
// в идеальный прямоугольник 3 колонки × N строк БЕЗ единой дырки: никаких
// декоративных пустот-заполнителей, только сами карточки.
const FIVE_GROUP = [
  { size: 'big', col: '1 / 4', row: '1 / 2' },
  { size: 'wide', col: '1 / 3', row: '2 / 3' },
  { size: 'tall', col: '3 / 4', row: '2 / 4' },
  { size: 'standard', col: '1 / 2', row: '3 / 4' },
  { size: 'standard', col: '2 / 3', row: '3 / 4' },
];

const LAYOUTS = {
  1: [{ size: 'big', col: '1 / 4', row: '1 / 2' }],
  2: [
    { size: 'wide', col: '1 / 3', row: '1 / 2' },
    { size: 'standard', col: '3 / 4', row: '1 / 2' },
  ],
  3: [
    { size: 'standard', col: '1 / 2', row: '1 / 2' },
    { size: 'standard', col: '2 / 3', row: '1 / 2' },
    { size: 'standard', col: '3 / 4', row: '1 / 2' },
  ],
  4: [
    { size: 'big', col: '1 / 4', row: '1 / 2' },
    { size: 'standard', col: '1 / 2', row: '2 / 3' },
    { size: 'standard', col: '2 / 3', row: '2 / 3' },
    { size: 'standard', col: '3 / 4', row: '2 / 3' },
  ],
  5: FIVE_GROUP,
  6: [
    { size: 'big', col: '1 / 4', row: '1 / 2' },
    { size: 'wide', col: '1 / 3', row: '2 / 3' },
    { size: 'standard', col: '3 / 4', row: '2 / 3' },
    { size: 'standard', col: '1 / 2', row: '3 / 4' },
    { size: 'standard', col: '2 / 3', row: '3 / 4' },
    { size: 'standard', col: '3 / 4', row: '3 / 4' },
  ],
  // FIVE_GROUP (3 строки, 9 ячеек) + ряд из wide+standard (2+1=3 ячейки,
  // 1 строка) — итого 4 строки×3 колонки = 12 ячеек на 7 карточек, без остатка
  7: [
    ...FIVE_GROUP,
    { size: 'wide', col: '1 / 3', row: '4 / 5' },
    { size: 'standard', col: '3 / 4', row: '4 / 5' },
  ],
  8: [
    ...FIVE_GROUP,
    { size: 'standard', col: '1 / 2', row: '4 / 5' },
    { size: 'standard', col: '2 / 3', row: '4 / 5' },
    { size: 'standard', col: '3 / 4', row: '4 / 5' },
  ],
  9: [
    ...FIVE_GROUP,
    { size: 'wide', col: '1 / 3', row: '4 / 5' },
    { size: 'tall', col: '3 / 4', row: '4 / 6' },
    { size: 'standard', col: '1 / 2', row: '5 / 6' },
    { size: 'standard', col: '2 / 3', row: '5 / 6' },
  ],
  // два FIVE_GROUP подряд (3+3 строки, 9+9=18 ячеек = 6 строк×3 колонки) —
  // 10 карточек укладываются без единого зазора
  10: [
    ...FIVE_GROUP,
    { size: 'big', col: '1 / 4', row: '4 / 5' },
    { size: 'wide', col: '1 / 3', row: '5 / 6' },
    { size: 'tall', col: '3 / 4', row: '5 / 7' },
    { size: 'standard', col: '1 / 2', row: '6 / 7' },
    { size: 'standard', col: '2 / 3', row: '6 / 7' },
  ],
};

function getLayout(n) {
  return { slots: LAYOUTS[Math.max(1, Math.min(n, 10))] };
}

function variantFor(post, index, slots) {
  const hasImage = !!post.cover_image;
  const teaser = post.summary || post.body || '';
  // длинному названию/тексту нужно больше места под текст, а не под мини-превью
  const longText = post.title.length > 55 || teaser.length > 170;
  const size = slots[index].size;

  if (size === 'big') return hasImage ? 'featured' : 'featured-quote';
  if (size === 'wide') return hasImage ? 'wide' : 'wide-quote';
  if (size === 'tall') return hasImage ? 'tall' : 'tall-quote';
  if (!hasImage) return 'quote';
  return hasImage && !longText && index % 2 === 0 ? 'mini' : 'image';
}

// без cover_image показываем не пустоту, а декоративную заглушку с
// шестиугольником — в общем геометрическом языке сайта, а не дырку в вёрстке
function NewsCover({ post, className }) {
  if (post.cover_image) {
    return <div className={className} style={{ backgroundImage: `url(${post.cover_image})` }} />;
  }
  return (
    <div className={`${className} news-card__cover--placeholder`}>
      <span className="news-card__cover-hex" />
    </div>
  );
}

function NewsCard({ post, variant, style }) {
  const teaser = post.summary || post.body;
  const meta = (
    <div className="news-card__meta">
      {new Date(post.published_at).toLocaleDateString('ru-RU')}
      {post.author && <> · {displayName(post.author)}</>}
    </div>
  );
  const tags = (
    <div className="news-card__tags">
      {(post.tags || []).map((t) => <span key={t} className="badge">#{t}</span>)}
    </div>
  );

  if (variant === 'featured') {
    return (
      <Link to={`/news/${post.slug}`} className="card card--interactive news-card news-card--featured" style={{ color: 'inherit', ...style }}>
        <NewsCover post={post} className="news-card__cover" />
        <div className="news-card__body">
          {meta}
          <h3 style={{ margin: '0.3rem 0 0.5rem' }}>{post.title}</h3>
          <p style={{ margin: '0 0 0.6rem', color: 'var(--text-secondary)' }}>{teaser}</p>
          {tags}
        </div>
      </Link>
    );
  }

  if (variant === 'featured-quote') {
    return (
      <Link to={`/news/${post.slug}`} className="card card--interactive news-card news-card--featured-quote" style={{ color: 'inherit', ...style }}>
        <span className="news-card__orbit" aria-hidden="true">
          <span className="news-card__orbit-ring" />
          <span className="news-card__orbit-ring news-card__orbit-ring--b" />
          <span className="news-card__orbit-dot" />
        </span>
        <div className="eyebrow">{(post.tags || [])[0] || 'новость'}</div>
        <h3 style={{ margin: '0.4rem 0 0.7rem', maxWidth: '70%' }}>{post.title}</h3>
        <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: '65%' }}>{teaser}</p>
        {meta}
      </Link>
    );
  }

  if (variant === 'wide') {
    return (
      <Link to={`/news/${post.slug}`} className="card card--interactive news-card news-card--wide" style={{ color: 'inherit', ...style }}>
        <NewsCover post={post} className="news-card__cover" />
        <div className="news-card__body">
          {meta}
          <h3 style={{ margin: '0.3rem 0 0.5rem' }}>{post.title}</h3>
          <p style={{ margin: '0 0 0.6rem', color: 'var(--text-secondary)' }}>{teaser}</p>
          {tags}
        </div>
      </Link>
    );
  }

  if (variant === 'wide-quote') {
    return (
      <Link to={`/news/${post.slug}`} className="card card--interactive news-card news-card--wide-quote" style={{ color: 'inherit', ...style }}>
        <span className="news-card__circuit" aria-hidden="true">
          <span className="news-card__circuit-dot" /><span className="news-card__circuit-dot" /><span className="news-card__circuit-dot" />
        </span>
        <div className="eyebrow">{(post.tags || [])[0] || 'новость'}</div>
        <h3 style={{ margin: '0.4rem 0 0.6rem' }}>{post.title}</h3>
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{teaser}</p>
        {meta}
      </Link>
    );
  }

  if (variant === 'tall') {
    return (
      <Link to={`/news/${post.slug}`} className="card card--interactive news-card news-card--tall" style={{ color: 'inherit', ...style }}>
        <NewsCover post={post} className="news-card__cover news-card__cover--tall" />
        <div className="news-card__body">
          {meta}
          <h3 style={{ margin: '0.3rem 0 0.5rem' }}>{post.title}</h3>
          <p style={{ margin: '0 0 0.6rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{teaser}</p>
          {tags}
        </div>
      </Link>
    );
  }

  if (variant === 'tall-quote') {
    return (
      <Link to={`/news/${post.slug}`} className="card card--interactive news-card news-card--tall-quote" style={{ color: 'inherit', ...style }}>
        <span className="news-card__cover-hex news-card__cover-hex--lone" />
        <div className="eyebrow">{(post.tags || [])[0] || 'новость'}</div>
        <p className="news-card__quote-text">«{teaser.slice(0, 160)}{teaser.length > 160 ? '…' : ''}»</p>
        <strong style={{ fontSize: '0.92rem' }}>{post.title}</strong>
        {meta}
      </Link>
    );
  }

  if (variant === 'quote') {
    return (
      <Link to={`/news/${post.slug}`} className="card card--interactive news-card news-card--quote" style={{ color: 'inherit', ...style }}>
        <div className="eyebrow">{(post.tags || [])[0] || 'новость'}</div>
        <p className="news-card__quote-text">«{teaser.slice(0, 140)}{teaser.length > 140 ? '…' : ''}»</p>
        <strong style={{ fontSize: '0.92rem' }}>{post.title}</strong>
        {meta}
      </Link>
    );
  }

  if (variant === 'mini') {
    return (
      <Link to={`/news/${post.slug}`} className="card card--interactive news-card news-card--mini" style={{ color: 'inherit', ...style }}>
        <NewsCover post={post} className="news-card__mini-cover" />
        <div>
          {meta}
          <strong style={{ display: 'block', margin: '0.2rem 0 0.3rem' }}>{post.title}</strong>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{teaser.slice(0, 80)}…</p>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/news/${post.slug}`} className="card card--interactive news-card" style={{ color: 'inherit', ...style }}>
      <NewsCover post={post} className="news-card__cover" />
      <div className="news-card__body">
        {meta}
        <h3 style={{ margin: '0.3rem 0 0.5rem' }}>{post.title}</h3>
        <p style={{ margin: '0 0 0.6rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{teaser}</p>
        {tags}
      </div>
    </Link>
  );
}

export default function NewsPage() {
  const [news, setNews] = useState(null);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [allTags, setAllTags] = useState([]);
  // 701px — ровно граница существующего мобильного брейкпоинта в news.css
  // (max-width: 700px), чтобы не было промежуточной зоны без явных правил
  const isDesktop = useMediaQuery('(min-width: 701px)');

  // шаблон раскладки зависит от того, сколько новостей реально пришло на
  // страницу (1..10) — на неполной последней странице это не "урезанная"
  // десятка, а отдельный, специально подобранный под это число прямоугольник
  const layout = getLayout(news ? news.length : 10);

  // клик по тегу — переключатель: уже выбран → убираем, иначе добавляем
  // (максимум 5 одновременно, чтобы ?tags= не разрастался бесконечно)
  const toggleTag = (t) => {
    setSelectedTags((list) => (
      list.includes(t) ? list.filter((x) => x !== t) : list.length < 5 ? [...list, t] : list
    ));
  };

  // тег-облако считаем один раз по более широкой выборке (без фильтров),
  // а не только по текущей странице — иначе после фильтрации теги исчезали бы.
  // Сортируем по популярности (по числу новостей с этим тегом) — самые
  // частые теги в начале ленты, редкие — в конце
  useEffect(() => {
    apiClient.get('/news/', { params: { page_size: 100 } })
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data.results || [];
        const counts = new Map();
        list.forEach((n) => (n.tags || []).forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
        setAllTags([...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const params = { page };
      if (search) params.search = search;
      if (selectedTags.length) params.tags = selectedTags.join(',');
      apiClient.get('/news/', { params })
        .then(({ data }) => {
          if (Array.isArray(data)) {
            setNews(data);
            setCount(data.length);
          } else {
            setNews(data.results || []);
            setCount(data.count || 0);
          }
        })
        .catch(() => {
          setNews(DEMO_NEWS);
          setCount(DEMO_NEWS.length);
        });
    }, 250);
    return () => clearTimeout(t);
  }, [search, selectedTags, page]);

  useEffect(() => { setPage(1); }, [search, selectedTags]);

  const totalPages = Math.max(1, Math.ceil(count / 10));

  return (
    <div>
      <div className="eyebrow">обновления языка и платформы</div>
      <h1 style={{ marginTop: 0 }}>Новости</h1>

      <div className="news-filters">
        <input
          type="text"
          placeholder="Поиск по заголовку, тексту или автору…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {allTags.length > 0 && (
        <div className="news-tag-cloud">
          {allTags.map((t) => (
            <button
              key={t}
              type="button"
              title={selectedTags.includes(t) ? 'Нажмите, чтобы убрать из выборки' : 'Показать новости с этим тегом'}
              className={`badge ${selectedTags.includes(t) ? 'badge--active' : ''}`}
              onClick={() => toggleTag(t)}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      {news === null && <p style={{ color: 'var(--text-secondary)' }}>Загрузка…</p>}
      {news && news.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Ничего не нашлось.</p>}

      <div className="news-grid">
        {news && news.map((n, i) => {
          const slot = layout.slots[i];
          const style = isDesktop && slot ? { gridColumn: slot.col, gridRow: slot.row } : undefined;
          return <NewsCard key={n.id} post={n} variant={variantFor(n, i, layout.slots)} style={style} />;
        })}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
