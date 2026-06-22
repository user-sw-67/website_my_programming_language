import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import apiClient from '../api/client.js';
import { displayName } from '../utils/userDisplay.js';
import '../styles/news.css';

// маленький декоративный разделитель между блоками статьи — не несёт
// информации, просто "дыхание" между смысловыми кусками текста, в духе
// остальной анимационной язык сайта (но лёгкий, CSS, без 3D — на странице
// новости их может быть несколько подряд, заводить под каждый отдельный
// WebGL-канвас как в ленте новостей было бы избыточно)
function BlockDivider() {
  return (
    <div className="news-detail__divider" aria-hidden="true">
      <span className="news-detail__divider-dot" />
    </div>
  );
}

// блок без фото — текстовая "врезка", визуально как home-news__quote
// (акцентная полоса слева), а не просто очередной абзац
function TextBlock({ text }) {
  return <p className="news-detail__block-quote">{text}</p>;
}

// блок с фото — текст и картинка рядом, попеременно слева/справа по
// чётности индекса, чтобы статья не выглядела однообразной "стеной" из
// одинаковых карточек
function ImageBlock({ block, reverse }) {
  return (
    <div className={`news-detail__block ${reverse ? 'news-detail__block--reverse' : ''}`}>
      <div className="news-detail__block-image" style={{ backgroundImage: `url(${block.image})` }} />
      <p className="news-detail__block-text">{block.text}</p>
    </div>
  );
}

export default function NewsDetailPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiClient.get(`/news/${slug}/`)
      .then(({ data }) => setPost(data))
      .catch(() => setError(true));
  }, [slug]);

  if (error) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <h2>Новость не найдена</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Такой новости не существует.</p>
        <Link to="/news" className="btn btn-primary">← Ко всем новостям</Link>
      </div>
    );
  }

  if (!post) return <p style={{ color: 'var(--text-secondary)' }}>Загрузка…</p>;

  return (
    <div className="news-detail">
      <Link to="/news" className="topic-detail__back">← Ко всем новостям</Link>

      {post.cover_image ? (
        <div className="news-detail__cover" style={{ backgroundImage: `url(${post.cover_image})` }} />
      ) : (
        <div className="news-detail__cover news-card__cover--placeholder">
          <span className="news-card__cover-hex" />
        </div>
      )}

      <div className="news-detail__meta">
        {new Date(post.published_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
        {post.author && <> · {displayName(post.author)}</>}
      </div>

      <h1 style={{ marginTop: '0.3rem' }}>{post.title}</h1>

      <div className="news-card__tags" style={{ marginBottom: '1.25rem' }}>
        {(post.tags || []).map((t) => <span key={t} className="badge">#{t}</span>)}
      </div>

      {post.blocks && post.blocks.length > 0 ? (
        <div className="news-detail__blocks">
          {post.blocks.map((block, i) => (
            <React.Fragment key={i}>
              {block.image ? (
                <ImageBlock block={block} reverse={i % 2 === 1} />
              ) : (
                <TextBlock text={block.text} />
              )}
              {i < post.blocks.length - 1 && i % 2 === 1 && <BlockDivider />}
            </React.Fragment>
          ))}
        </div>
      ) : (
        // старые новости (без блоков, например демо-данные) — как раньше,
        // просто текстом
        <div className="news-detail__body">{post.body}</div>
      )}
    </div>
  );
}
