import React, { useEffect, useState } from 'react';
import apiClient from '../api/client.js';
import { RatingForm } from './ChatPanel.jsx';

const SENDER_LABEL = { user: 'Пользователь', ai: 'ИИ-помощник', developer: 'Разработчик', system: '' };

/** Статичный (без WebSocket) просмотр уже завершённого разговора — для
 * истории обращений пользователя и вкладки «Завершённые» у сеньоров.
 * allowRating включается только для автора обращения (его собственная
 * история в SupportWidget) — сеньоры в AdminPage читают чужие разговоры. */
export default function ChatTranscript({ sessionId, allowRating = false, onUpdate }) {
  const [session, setSession] = useState(null);

  useEffect(() => {
    setSession(null);
    apiClient.get(`/support/sessions/${sessionId}/`).then(({ data }) => setSession(data)).catch(() => setSession(false));
  }, [sessionId]);

  if (session === null) return <p style={{ color: 'var(--text-secondary)', padding: '1rem' }}>Загрузка…</p>;
  if (session === false) return <p style={{ color: 'var(--text-secondary)', padding: '1rem' }}>Не удалось загрузить разговор.</p>;

  const submitRating = async (value, review) => {
    const { data } = await apiClient.post(`/support/sessions/${sessionId}/rate/`, { rating: value, review });
    setSession(data);
    // список слева (история в профиле/админке) хранит свою отдельную копию
    // сессий — без этого вызова оценка не появлялась бы там до перезагрузки
    onUpdate?.(data);
  };

  return (
    <div className="chat-panel__inner">
      <div className="chat-panel__status">
        <span>🔒 Обращение завершено{session.closed_at ? ` · ${new Date(session.closed_at).toLocaleString('ru-RU')}` : ''}</span>
      </div>
      <div className="chat-panel__body">
        {session.messages.map((m) => (
          m.sender === 'system' ? (
            <div key={m.id} className="chat-msg chat-msg--system">{m.body}</div>
          ) : (
            <div key={m.id} className={`chat-msg chat-msg--${m.sender}`}>
              <span className="chat-msg__author">{SENDER_LABEL[m.sender]}</span>
              {m.body}
            </div>
          )
        ))}
        {allowRating && session.rating === null && <RatingForm onSubmit={submitRating} />}
        {session.rating !== null && (
          <div className="chat-rating chat-rating--done">
            {allowRating ? 'Ваша оценка: ' : 'Оценка пользователя: '}
            {'★'.repeat(session.rating)}{session.review && ` — ${session.review}`}
          </div>
        )}
        {!allowRating && session.rating === null && (
          <div className="chat-rating chat-rating--empty">Пользователь пока не оставил оценку этого разговора.</div>
        )}
      </div>
    </div>
  );
}
