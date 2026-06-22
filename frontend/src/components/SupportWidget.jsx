import React, { useEffect, useRef, useState } from 'react';
import apiClient from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import ChatPanel from './ChatPanel.jsx';
import '../styles/chat.css';

/** Плавающий виджет поддержки — только текущий активный разговор (с ИИ-ботом
 * или разработчиком). Полная история всех обращений (включая завершённые,
 * с оценками) живёт в профиле пользователя (см. ProfilePage.jsx::SupportHistoryTab),
 * а не лишней кнопкой здесь — виджет должен оставаться компактным.
 *
 * Сессия на бэкенде создаётся НЕ при открытии виджета, а лениво — только
 * когда пользователь реально что-то делает (пишет сообщение или подключает
 * разработчика, см. useChatSocket.js/ChatPanel.jsx). Иначе случайный клик по
 * кнопке поддержки заводил бы пустое "мусорное" обращение, которое потом
 * нужно было бы вручную завершать. */
export default function SupportWidget() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);
  const panelRef = useRef(null);
  const launcherRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (panelRef.current?.contains(e.target)) return;
      if (launcherRef.current?.contains(e.target)) return;
      // модалка подтверждения и тосты (FeedbackContext.jsx) рендерятся через
      // портал в document.body, то есть формально лежат ВНЕ panelRef — без
      // этой проверки клик по кнопке «Завершить» в диалоге подтверждения
      // сначала закрывал (размонтировал) сам виджет, и WebSocket уже не
      // успевал отправить close_session к моменту, когда промис confirm()
      // резолвился (баг, реально воспроизводился)
      if (e.target.closest('.confirm-backdrop, .toast-stack')) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open || !user || checked) return;
    setChecking(true);
    // только проверяем, есть ли уже незакрытое обращение — ничего не создаём
    apiClient.get('/support/sessions/?mine=true')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data.results || [];
        const active = list.find((s) => s.status !== 'closed');
        if (active) setSessionId(active.id);
      })
      .finally(() => {
        setChecking(false);
        setChecked(true);
      });
  }, [open, user, checked]);

  const createSession = () => apiClient.post('/support/sessions/', {}).then(({ data }) => data);

  return (
    <>
      {open && (
        <div className="chat-panel" ref={panelRef}>
          <div className="chat-panel__header">
            <strong>Поддержка ATOM</strong>
          </div>
          {!user && !loading ? (
            <div className="chat-panel__inner">
              <div className="chat-panel__body">
                <div className="chat-msg chat-msg--ai">
                  <span className="chat-msg__author">ИИ-помощник</span>
                  Привет! Чтобы я (а при необходимости — и живой разработчик) видел историю
                  переписки и мог помочь по-настоящему, войдите в аккаунт. Без входа чат не сохраняется.
                </div>
              </div>
            </div>
          ) : checking || !checked ? (
            <div className="chat-panel__inner">
              <div className="chat-panel__body">
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Подключение…</p>
              </div>
            </div>
          ) : (
            <ChatPanel sessionId={sessionId} createSession={createSession} />
          )}
        </div>
      )}
      <div className="chat-launcher" ref={launcherRef}>
        <span className="chat-launcher__label">{open ? 'Закрыть чат' : 'Нужна помощь?'}</span>
        <button className="chat-fab" onClick={() => setOpen((o) => !o)} aria-label="Поддержка">
          {open ? '✕' : '💬'}
          {!open && <span className="chat-fab__badge" />}
        </button>
      </div>
    </>
  );
}
