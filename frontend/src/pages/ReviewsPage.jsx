import React, { useEffect, useState } from 'react';
import apiClient from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

const DEMO_REVIEWS = [
  { id: 'demo-1', author: { username: 'guest_dev' }, rating: 5, body: 'Понравилась идея gradual typing — удобно для прототипов и обучения.', developer_response: '', responded_by: null },
  { id: 'demo-2', author: { username: 'mercedessupov' }, rating: 4, body: 'Хочу свёртку строк на этапе оптимизации, но в целом синтаксис приятный.', developer_response: 'Записали в план, спасибо!', responded_by: { username: 'mercedessupov' } },
  { id: 'demo-3', author: { username: 'anon' }, rating: 3, body: 'Не хватает стандартной библиотеки, жду @string и @file модули.', developer_response: '', responded_by: null },
];

function Stars({ value }) {
  return (
    <span style={{ color: 'var(--accent)' }}>
      {'★'.repeat(value)}
      <span style={{ color: 'var(--border)' }}>{'★'.repeat(5 - value)}</span>
    </span>
  );
}

function ReviewCard({ review, canRespond, onResponded }) {
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const submitResponse = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const { data } = await apiClient.post(`/feedback/${review.id}/respond/`, { developer_response: text });
      onResponded(data);
      setReplying(false);
    } catch {
      // бэкенд недоступен — молча оставляем форму открытой
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="card">
      <Stars value={review.rating} />
      <p style={{ color: 'var(--text-secondary)', margin: '0.6rem 0' }}>{review.body}</p>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>@{review.author?.username || 'аноним'}</div>

      {review.developer_response && (
        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
          <div className="eyebrow" style={{ marginBottom: '0.3rem' }}>
            ответ {review.responded_by?.username ? `@${review.responded_by.username}` : 'разработчика'}
          </div>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>{review.developer_response}</p>
        </div>
      )}

      {canRespond && !review.developer_response && (
        replying ? (
          <form onSubmit={submitResponse} style={{ marginTop: '0.75rem' }}>
            <textarea
              rows={2}
              required
              autoFocus
              placeholder="Ответ от лица команды ATOM…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{ width: '100%', marginBottom: '0.5rem' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary" disabled={sending}>
                {sending ? <span className="skeleton-spin" /> : 'Отправить ответ'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setReplying(false)}>
                Отмена
              </button>
            </div>
          </form>
        ) : (
          <button
            className="btn btn-secondary"
            style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}
            onClick={() => setReplying(true)}
          >
            Ответить
          </button>
        )
      )}
    </div>
  );
}

export default function ReviewsPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [form, setForm] = useState({ rating: 5, body: '' });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    apiClient.get('/feedback/')
      .then(({ data }) => setReviews(Array.isArray(data) ? data : data.results || []))
      .catch(() => {
        setReviews(DEMO_REVIEWS);
        setIsDemo(true);
      });
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const { data } = await apiClient.post('/feedback/', { kind: 'review', rating: form.rating, body: form.body });
      setReviews((list) => [data, ...(list || [])]);
      setForm({ rating: 5, body: '' });
    } catch {
      // бэкенд недоступен — молча оставляем форму как есть
    } finally {
      setSending(false);
    }
  };

  const handleResponded = (updated) => {
    setReviews((list) => list.map((r) => (r.id === updated.id ? updated : r)));
  };

  return (
    <div>
      <h1>Отзывы и предложения</h1>

      {user ? (
        <form onSubmit={submit} className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginTop: 0 }}>Оставить отзыв</h3>
          <div style={{ marginBottom: '0.75rem' }}>
            <select value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
            </select>
          </div>
          <textarea
            rows={3}
            required
            placeholder="Что думаете об ATOM?"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            style={{ width: '100%', marginBottom: '0.75rem' }}
          />
          <button className="btn btn-primary" disabled={sending}>
            {sending ? <span className="skeleton-spin" /> : 'Отправить'}
          </button>
        </form>
      ) : (
        <p style={{ color: 'var(--text-secondary)' }}>Войдите, чтобы оставить отзыв.</p>
      )}

      {reviews === null && <p style={{ color: 'var(--text-secondary)' }}>Загрузка…</p>}

      <div className="card-grid">
        {reviews && reviews.map((r) => (
          <ReviewCard key={r.id} review={r} canRespond={!isDemo && !!user?.is_developer} onResponded={handleResponded} />
        ))}
      </div>
    </div>
  );
}
