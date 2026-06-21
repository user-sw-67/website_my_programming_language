import React, { useEffect, useRef, useState } from 'react';
import { useChatSocket } from '../hooks/useChatSocket.js';

const SENDER_LABEL = { user: 'Вы', ai: 'ИИ-помощник', developer: 'Разработчик', system: '' };
const STATUS_LABEL = {
  ai: 'Отвечает ИИ',
  waiting_developer: 'Ждём разработчика…',
  with_developer: 'Разработчик на связи',
  closed: 'Обращение закрыто',
};

/** Общая панель чата — используется и в виджете поддержки (глаза пользователя),
 * и в админке на вкладке «Очередь поддержки» (глаза разработчика). */
export default function ChatPanel({ sessionId, asDeveloper = false }) {
  const { messages, status, send, requestDeveloper } = useChatSocket(sessionId);
  const [draft, setDraft] = useState('');
  const bodyRef = useRef(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [messages]);

  const onSend = () => {
    if (!draft.trim()) return;
    send(draft.trim());
    setDraft('');
  };

  return (
    <div className="chat-panel__inner">
      <div className="chat-panel__status">
        <span className="pulse-dot" />
        {STATUS_LABEL[status] || status}
      </div>
      <div className="chat-panel__body" ref={bodyRef}>
        {messages.map((m) => (
          m.sender === 'system' ? (
            <div key={m.id} className="chat-msg chat-msg--system">{m.body}</div>
          ) : (
            <div key={m.id} className={`chat-msg chat-msg--${m.sender}`}>
              <span className="chat-msg__author">{SENDER_LABEL[m.sender]}</span>
              {m.body}
            </div>
          )
        ))}
      </div>
      {!asDeveloper && status === 'ai' && (
        <button className="btn btn-secondary chat-panel__connect" onClick={requestDeveloper}>
          👨‍💻 Подключить разработчика
        </button>
      )}
      {status !== 'closed' && (
        <div className="chat-panel__footer">
          <input
            type="text"
            placeholder="Напишите сообщение…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSend()}
          />
          <button className="btn btn-primary" onClick={onSend}>→</button>
        </div>
      )}
    </div>
  );
}
