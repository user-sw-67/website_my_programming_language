import React, { useEffect, useRef, useState } from 'react';
import { useChatSocket } from '../hooks/useChatSocket.js';
import { useConfirm } from '../ui/FeedbackContext.jsx';

const SENDER_LABEL = { user: 'Вы', ai: 'ИИ-помощник', developer: 'Разработчик', system: '' };
const STATUS_LABEL = {
  ai: 'Отвечает ИИ',
  waiting_developer: 'Ждём разработчика…',
  with_developer: 'Разработчик на связи',
  closed: 'Обращение закрыто',
};

const CATEGORIES = [
  { value: 'question', label: 'Вопрос по языку или докам' },
  { value: 'site_broken', label: 'Не работает сайт/кабинет' },
  { value: 'language_bug', label: 'Баг в языке/компиляторе' },
  { value: 'critical', label: 'Критично: нет доступа/данных' },
];

export function RatingForm({ onSubmit }) {
  const [value, setValue] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!value) return;
    setBusy(true);
    try {
      await onSubmit(value, review.trim());
      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return <div className="chat-rating chat-rating--done">Спасибо за оценку!</div>;
  }

  return (
    <div className="chat-rating">
      <div className="chat-rating__title">Оцените разговор</div>
      <div className="chat-rating__stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`chat-rating__star ${n <= (hover || value) ? 'chat-rating__star--active' : ''}`}
            onClick={() => setValue(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        rows={2}
        placeholder="Что понравилось или что улучшить? (необязательно)"
        value={review}
        onChange={(e) => setReview(e.target.value)}
      />
      <button className="btn btn-primary" disabled={!value || busy} onClick={submit}>
        {busy ? <span className="skeleton-spin" /> : 'Отправить оценку'}
      </button>
    </div>
  );
}

/** Общая панель чата — используется и в виджете поддержки (глаза пользователя),
 * и в админке на вкладке «Очередь поддержки» (глаза разработчика).
 *
 * `sessionId` может быть `null` — "черновик" в виджете поддержки, сессия ещё
 * не создана на бэкенде (см. useChatSocket.js и SupportWidget.jsx); в этом
 * случае нужен `createSession`, который лениво создаст её по первому
 * реальному действию пользователя. */
export default function ChatPanel({ sessionId, asDeveloper = false, createSession }) {
  const { messages, status, rating, hasSession, send, requestDeveloper, closeSession, submitRating } =
    useChatSocket(sessionId, { createSession });
  const [draft, setDraft] = useState('');
  const [pickingCategory, setPickingCategory] = useState(false);
  const bodyRef = useRef(null);
  const confirm = useConfirm();
  // считаем, что диалог реально состоялся, только если в нём есть хоть одно
  // сообщение (или системная отметка эскалации) — иначе случайный заход в
  // чат без единого слова не должен давать возможность «завершить» или
  // «оценить» то, чего по сути не было
  const hasDialog = hasSession && messages.length > 0;

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [messages]);

  const onSend = () => {
    if (!draft.trim()) return;
    send(draft.trim());
    setDraft('');
  };

  const onClose = async () => {
    const text = asDeveloper
      ? 'Пользователь сможет открыть новое обращение, а этот разговор переместится в завершённые.'
      : 'Если вопрос не решён, вы всегда можете написать заново — история останется в истории обращений.';
    const ok = await confirm({ title: 'Завершить разговор?', text, confirmLabel: 'Завершить', danger: true });
    if (!ok) return;
    closeSession();
  };

  const pickCategory = (value) => {
    requestDeveloper(value);
    setPickingCategory(false);
  };

  return (
    <div className="chat-panel__inner">
      <div className="chat-panel__status">
        <span className="pulse-dot" />
        {STATUS_LABEL[status] || status}
        {hasDialog && status !== 'closed' && (asDeveloper ? status === 'with_developer' : true) && (
          <button className="chat-panel__close-btn" onClick={onClose} title="Завершить разговор">
            ✕ Завершить
          </button>
        )}
      </div>
      <div className="chat-panel__body" ref={bodyRef}>
        {!hasDialog && (
          <div className="chat-msg chat-msg--ai">
            <span className="chat-msg__author">ИИ-помощник</span>
            Привет! Напишите вопрос, и я постараюсь помочь — или сразу подключите разработчика кнопкой ниже.
          </div>
        )}
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
        {hasDialog && status === 'closed' && !asDeveloper && rating === null && (
          <RatingForm onSubmit={submitRating} />
        )}
      </div>
      {!asDeveloper && status === 'ai' && (
        pickingCategory ? (
          <div className="chat-category-picker">
            <div className="chat-category-picker__title">Что случилось?</div>
            {CATEGORIES.map((c) => (
              <button key={c.value} type="button" className="chat-category-picker__option" onClick={() => pickCategory(c.value)}>
                {c.label}
              </button>
            ))}
          </div>
        ) : (
          <button className="btn btn-secondary chat-panel__connect" onClick={() => setPickingCategory(true)}>
            👨‍💻 Подключить разработчика
          </button>
        )
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
