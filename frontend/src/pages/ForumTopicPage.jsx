import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import apiClient from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import '../styles/forum.css';

const DEMO_DETAIL = {
  'demo-1': {
    title: 'Как объявить вариативную функцию?',
    body: 'Пробую написать func sum(...nums) { } — компилятор ругается. Как правильно объявить вариативные аргументы в ATOM?',
    author: { username: 'guest_dev' },
    tags: ['func', 'args'],
    comments: [
      { id: 1, author: { username: 'mercedessupov' }, body: 'Синтаксис такой: func sum(...nums) { } — у тебя, похоже, опечатка где-то рядом. Покажи полный код функции.' },
      { id: 2, author: { username: 'guest_dev' }, body: 'А, нашёл — забыл точку с запятой после use. Спасибо!' },
    ],
  },
};

export default function ForumTopicPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [topic, setTopic] = useState(null);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (id.startsWith('demo-')) {
      setTopic(DEMO_DETAIL[id] || DEMO_DETAIL['demo-1']);
      return;
    }
    apiClient.get(`/forum/topics/${id}/`)
      .then(({ data }) => setTopic(data))
      .catch(() => setTopic(DEMO_DETAIL['demo-1']));
  }, [id]);

  const submitComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSending(true);
    try {
      const { data } = await apiClient.post('/forum/comments/', { topic: id, body: comment });
      setTopic((t) => ({ ...t, comments: [...(t.comments || []), data] }));
      setComment('');
    } catch {
      setTopic((t) => ({
        ...t,
        comments: [...(t.comments || []), { id: Date.now(), author: { username: user?.username || 'вы' }, body: comment }],
      }));
      setComment('');
    } finally {
      setSending(false);
    }
  };

  if (!topic) return <p style={{ color: 'var(--text-secondary)' }}>Загрузка…</p>;

  return (
    <div className="topic-detail">
      <Link to="/forum" className="topic-detail__back">← Назад к форуму</Link>

      <div className="card">
        <h1 style={{ marginTop: 0 }}>{topic.title}</h1>
        <div className="topic-detail__meta">
          <span>@{topic.author?.username || 'неизвестный автор'}</span>
          {(topic.tags || []).map((tag) => <span key={tag} className="badge">#{tag}</span>)}
        </div>
        <p className="topic-detail__body">{topic.body}</p>
      </div>

      <h3 style={{ marginTop: '2rem' }}>Ответы ({topic.comments?.length || 0})</h3>
      <div className="card">
        {(topic.comments || []).length === 0 && (
          <p style={{ color: 'var(--text-secondary)' }}>Пока нет ответов — будьте первым.</p>
        )}
        {(topic.comments || []).map((c) => (
          <div key={c.id} className="comment">
            <span className="comment__avatar">{(c.author?.username || '?').slice(0, 1).toUpperCase()}</span>
            <div className="comment__body">
              <div className="comment__author">@{c.author?.username || 'аноним'}</div>
              <p className="comment__text">{c.body}</p>
            </div>
          </div>
        ))}

        <form onSubmit={submitComment} className="comment-form">
          {user ? (
            <>
              <textarea
                rows={3}
                placeholder="Написать ответ…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                style={{ width: '100%' }}
              />
              <button className="btn btn-primary" style={{ marginTop: '0.6rem' }} disabled={sending}>
                {sending ? <span className="skeleton-spin" /> : 'Ответить'}
              </button>
            </>
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>Войдите, чтобы оставить ответ.</p>
          )}
        </form>
      </div>
    </div>
  );
}
