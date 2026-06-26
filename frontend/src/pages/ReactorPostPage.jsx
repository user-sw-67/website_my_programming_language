import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import apiClient from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import Avatar from '../components/Avatar.jsx';
import AttachmentsTerminal from '../components/AttachmentsTerminal.jsx';
import CommentEditor from '../components/CommentEditor.jsx';
import CommentThread from '../components/CommentThread.jsx';
import PostBlocks from '../components/PostBlocks.jsx';
import StarRating from '../components/StarRating.jsx';
import { developerRoleLabel, displayName } from '../utils/userDisplay.js';
import '../styles/reactor.css';

export default function ReactorPostPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [topic, setTopic] = useState(null);
  const [error, setError] = useState(false);
  const [comments, setComments] = useState(null);
  const [jumpTo, setJumpTo] = useState(null);
  const [rootBody, setRootBody] = useState('');
  const [rootBodyEmpty, setRootBodyEmpty] = useState(true);
  const [rootEditorKey, setRootEditorKey] = useState(0);
  const [sendingRoot, setSendingRoot] = useState(false);

  const loadTopic = () => {
    apiClient.get(`/forum/topics/${slug}/`)
      .then(({ data }) => setTopic(data))
      .catch(() => setError(true));
  };

  const loadComments = () => {
    apiClient.get(`/forum/topics/${slug}/comments/`)
      .then(({ data }) => setComments(data))
      .catch(() => setComments([]));
  };

  useEffect(() => { loadTopic(); loadComments(); }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleResolved = async () => {
    try {
      const { data } = await apiClient.patch(`/forum/topics/${slug}/`, { is_resolved: !topic.is_resolved });
      setTopic((t) => ({ ...t, is_resolved: data.is_resolved }));
    } catch {
      // тихо игнорируем — статус просто не обновится
    }
  };

  const rate = async (score) => {
    try {
      const { data } = await apiClient.post(`/forum/topics/${slug}/rate/`, { score });
      setTopic((t) => ({ ...t, avg_rating: data.avg_rating, ratings_count: data.ratings_count, my_rating: score }));
    } catch {
      // тихо игнорируем — рейтинг просто не обновится
    }
  };

  const submitRootComment = async (e) => {
    e.preventDefault();
    if (rootBodyEmpty) return;
    setSendingRoot(true);
    try {
      await apiClient.post('/forum/comments/', { topic: topic.id, body: rootBody });
      setRootBody('');
      setRootBodyEmpty(true);
      setRootEditorKey((k) => k + 1);
      loadComments();
    } catch {
      // тихо игнорируем
    } finally {
      setSendingRoot(false);
    }
  };

  // подсветка диапазона строк в терминале — временная, гаснет сама через
  // несколько секунд («на время выделяет», а не навсегда)
  const jumpToReference = (ref) => {
    setJumpTo(ref);
    setTimeout(() => setJumpTo((cur) => (cur === ref ? null : cur)), 2600);
  };

  if (error) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <h2>Пост не найден</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Такого поста не существует или он скрыт автором.</p>
        <Link to="/forum" className="btn btn-primary">← В Реактор</Link>
      </div>
    );
  }

  if (!topic) return <p style={{ color: 'var(--text-secondary)' }}>Загрузка…</p>;

  const isAuthor = user && topic.author && user.id === topic.author.id;

  return (
    <div className="reactor-detail">
      <Link to="/forum" className="topic-detail__back">← В Реактор</Link>

      <div className="card reactor-detail__header">
        <div className="reactor-detail__header-top">
          <div className="reactor-detail__author">
            <Avatar user={topic.author} size={44} />
            <div>
              <div className="reactor-detail__author-name">
                {topic.author ? displayName(topic.author) : 'аноним'}
                {developerRoleLabel(topic.author) && (
                  <span className="badge comment__badge-dev">{developerRoleLabel(topic.author)}</span>
                )}
              </div>
              <div className="reactor-detail__meta">
                {new Date(topic.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                {topic.category && <> · {topic.category.name}</>}
                {topic.is_hidden && <> · <span style={{ color: 'var(--warning)' }}>скрыт от других</span></>}
              </div>
            </div>
          </div>

          <div className="reactor-detail__rating-card" title="Средняя оценка поста">
            <div className="reactor-detail__rating-number">{(topic.avg_rating || 0).toFixed(1)}</div>
            <StarRating value={topic.avg_rating || 0} size={15} />
            <div className="reactor-detail__rating-count">{topic.ratings_count} оценок</div>
          </div>
        </div>

        <h1 style={{ margin: '1rem 0 0.4rem' }}>{topic.title}</h1>
        {topic.summary && <p style={{ color: 'var(--text-secondary)', marginTop: 0 }}>{topic.summary}</p>}

        <div className="reactor-card__tags" style={{ marginBottom: '0.75rem' }}>
          {(topic.tags || []).map((t) => <span key={t} className="badge">#{t}</span>)}
          {topic.is_resolved && <span className="badge badge--solved">решено</span>}
          {isAuthor && (
            <button type="button" className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '0.3rem 0.7rem' }} onClick={toggleResolved}>
              {topic.is_resolved ? 'Снять отметку «решено»' : 'Отметить решённым'}
            </button>
          )}
        </div>

        {topic.github_url && (
          <a href={topic.github_url} target="_blank" rel="noreferrer" className="reactor-detail__github">
            <span className="reactor-detail__github-icon">🐙</span>
            <span>
              <strong>Открыть на GitHub</strong>
              <span className="reactor-detail__github-url">{topic.github_url.replace(/^https?:\/\//, '')}</span>
            </span>
          </a>
        )}

        {user && !isAuthor && (
          <div className="reactor-detail__rating">
            <div className="reactor-detail__rate-mine">
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Ваша оценка:</span>
              <StarRating value={topic.my_rating || 0} interactive onRate={rate} size={20} />
            </div>
          </div>
        )}
      </div>

      {topic.blocks && topic.blocks.length > 0 ? (
        <PostBlocks blocks={topic.blocks} />
      ) : topic.body ? (
        <div className="card reactor-detail__plain-body">{topic.body}</div>
      ) : null}

      {topic.attachments && topic.attachments.length > 0 && (
        <>
          <h3>Файлы</h3>
          <AttachmentsTerminal attachments={topic.attachments} jumpTo={jumpTo} />
        </>
      )}

      <h3 style={{ marginTop: '2rem' }}>Комментарии</h3>
      <div className="card">
        {comments === null ? (
          <p style={{ color: 'var(--text-secondary)' }}>Загрузка…</p>
        ) : (
          <CommentThread
            comments={comments}
            topicSlug={slug}
            attachments={topic.attachments}
            onReplyPosted={loadComments}
            onJumpToReference={jumpToReference}
          />
        )}

        <form onSubmit={submitRootComment} className="comment-form">
          {user ? (
            <>
              <CommentEditor
                key={rootEditorKey}
                attachments={topic.attachments}
                onChange={(html, isEmpty) => { setRootBody(html); setRootBodyEmpty(isEmpty); }}
              />
              <button className="btn btn-primary" style={{ marginTop: '0.6rem' }} disabled={sendingRoot || rootBodyEmpty}>
                {sendingRoot ? <span className="skeleton-spin" /> : 'Комментировать'}
              </button>
            </>
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>Войдите, чтобы оставить комментарий.</p>
          )}
        </form>
      </div>
    </div>
  );
}
