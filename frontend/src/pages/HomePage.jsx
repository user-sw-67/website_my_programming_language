import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client.js';
import '../styles/home.css';

// ссылка на репозиторий настраивается через VITE_GITHUB_REPO_URL (см.
// .env.example) — там лежит весь компилятор ATOM, не только сайт; если
// переменная не задана, кнопка на главной просто не рендерится
const GITHUB_REPO_URL = import.meta.env.VITE_GITHUB_REPO_URL || '';

// официальный значок GitHub (Octocat-mark) — инлайн-SVG, без иконочного
// пакета: используется в одном месте, тащить целую библиотеку лишнее
function GithubMark() {
  return (
    <svg className="btn-github__icon" viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
           0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13
           -.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66
           .07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15
           -.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0
           1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82
           1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01
           1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
  );
}

const FEATURES = [
  {
    to: '/editor',
    title: 'Редактор-терминал',
    text: 'Браузерный редактор кода ATM в стиле VS Code: дерево проекта, флаги компиляции, консоль вывода.',
  },
  {
    to: '/docs',
    title: 'Документация',
    text: 'Полное описание синтаксиса ATOM, gradual typing и REST API платформы.',
  },
  {
    to: '/learn',
    title: 'Как создавался ATOM',
    text: 'История разработки лексера, парсера и семантического анализатора с реальным кодом.',
  },
  {
    to: '/forum',
    title: 'Форум сообщества',
    text: 'Вопросы и ответы в стиле StackOverflow, обмен опытом между разработчиками на ATOM.',
  },
  {
    to: '/repositories',
    title: 'Проекты пользователей',
    text: 'Витрина пользовательских репозиториев и историй о том, как они написаны.',
  },
  {
    to: '/news',
    title: 'Новости',
    text: 'Обновления языка и платформы прямо от команды разработчиков.',
  },
];

function LatestNews() {
  const [news, setNews] = useState(null);

  useEffect(() => {
    apiClient.get('/news/')
      .then(({ data }) => setNews((Array.isArray(data) ? data : data.results || []).slice(0, 3)))
      .catch(() => setNews([]));
  }, []);

  if (!news || news.length === 0) return null;
  const [featured, ...rest] = news;
  // блок должен одинаково хорошо смотреться при 1, 2 или 3 новостях (на
  // молодом сайте их может быть меньше трёх) — а не просто скрывать вторую
  // колонку и оставлять пустоту справа
  const sideCount = rest.length;

  return (
    <section style={{ marginBottom: '2.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
        <div>
          <div className="eyebrow">свежее</div>
          <h2 style={{ margin: 0 }}>Последние новости</h2>
        </div>
        <Link to="/news" className="btn btn-secondary">Все новости →</Link>
      </div>

      <div className={`home-news ${sideCount === 0 ? 'home-news--solo' : ''}`}>
        <Link
          to={`/news/${featured.slug}`}
          className="card card--interactive home-news__featured"
          style={{ color: 'inherit' }}
        >
          {featured.cover_image ? (
            <div className="home-news__featured-cover" style={{ backgroundImage: `url(${featured.cover_image})` }} />
          ) : (
            <div className="home-news__featured-cover news-card__cover--placeholder">
              <span className="news-card__cover-hex" />
            </div>
          )}
          <div className="home-news__featured-body">
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              {new Date(featured.published_at).toLocaleDateString('ru-RU')}
            </div>
            <h3 style={{ margin: '0.3rem 0 0.5rem' }}>{featured.title}</h3>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{featured.summary || featured.body}</p>
          </div>
        </Link>

        {sideCount > 0 && (
          <div className="home-news__side">
            {/* при единственной боковой карточке она одна растягивается на
                всю высоту колонки (flex: 1) — иначе под ней осталась бы
                пустая полоса до высоты левой featured-карточки */}
            <Link
              to={`/news/${rest[0].slug}`}
              className="card card--interactive home-news__card"
              style={{ color: 'inherit', flex: sideCount === 1 ? 1 : undefined }}
            >
              {rest[0].cover_image ? (
                <div className="home-news__card-cover" style={{ backgroundImage: `url(${rest[0].cover_image})` }} />
              ) : (
                <div className="home-news__card-cover news-card__cover--placeholder">
                  <span className="news-card__cover-hex" />
                </div>
              )}
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                  {new Date(rest[0].published_at).toLocaleDateString('ru-RU')}
                </div>
                <strong style={{ display: 'block', margin: '0.2rem 0 0.3rem' }}>{rest[0].title}</strong>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                  {(rest[0].summary || rest[0].body).slice(0, 80)}…
                </p>
              </div>
            </Link>

            {sideCount > 1 && (
              <Link to={`/news/${rest[1].slug}`} className="card card--interactive home-news__quote" style={{ color: 'inherit' }}>
                <div className="eyebrow">{(rest[1].tags || [])[0] || 'новость'}</div>
                <p style={{ margin: '0.4rem 0', fontSize: '0.95rem' }}>«{(rest[1].summary || rest[1].body).slice(0, 90)}…»</p>
                <strong style={{ fontSize: '0.85rem' }}>{rest[1].title}</strong>
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div>
      <section style={{ textAlign: 'center', padding: '3rem 1rem 4rem' }}>
        <div className="eyebrow" style={{ justifyContent: 'center', width: '100%' }}>система компиляции v0.1</div>
        <span className="badge">гибридная типизация · C++ компилятор с нуля</span>
        <h1
          style={{
            fontSize: '3rem',
            margin: '1rem 0 0.75rem',
            background: 'linear-gradient(120deg, var(--accent), var(--text-primary) 60%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          ATOM
        </h1>
        <p
          style={{
            maxWidth: 640,
            margin: '0 auto',
            color: 'var(--text-secondary)',
            fontSize: '1.1rem',
            lineHeight: 1.7,
          }}
        >
          Экспериментальный язык программирования с гибридной типизацией.
          Пишите и компилируйте код прямо в браузере, изучайте документацию и общайтесь
          с сообществом — всё в одном месте.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.75rem', flexWrap: 'wrap' }}>
          <Link to="/editor" className="btn btn-primary">
            Открыть редактор →
          </Link>
          <Link to="/learn" className="btn btn-secondary">
            Как это работает
          </Link>
          {GITHUB_REPO_URL && (
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-github"
            >
              <GithubMark />
              Исходный код на GitHub
            </a>
          )}
        </div>
      </section>

      <div className="skew-divider" />

      <section className="card-grid card-grid--features" style={{ marginBottom: '2.5rem' }}>
        {FEATURES.map((f) => (
          <Link key={f.to} to={f.to} className="card card--interactive" style={{ color: 'inherit' }}>
            <h3 style={{ marginTop: 0, color: 'var(--accent)' }}>{f.title}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.55 }}>{f.text}</p>
          </Link>
        ))}
      </section>

      <LatestNews />
    </div>
  );
}
