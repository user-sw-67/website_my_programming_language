import React, { useEffect, useRef, useState } from 'react';
import apiClient from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import ChatPanel from './ChatPanel.jsx';
import '../styles/chat.css';

export default function SupportWidget() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [creating, setCreating] = useState(false);
  const panelRef = useRef(null);
  const launcherRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (panelRef.current?.contains(e.target)) return;
      if (launcherRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open || !user || sessionId) return;
    setCreating(true);
    // переиспользуем последнее незакрытое обращение, если есть, иначе создаём новое
    apiClient.get('/support/sessions/')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data.results || [];
        const active = list.find((s) => s.status !== 'closed');
        if (active) return active;
        return apiClient.post('/support/sessions/', {}).then(({ data: created }) => created);
      })
      .then((session) => setSessionId(session.id))
      .finally(() => setCreating(false));
  }, [open, user, sessionId]);

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
          ) : creating || !sessionId ? (
            <div className="chat-panel__inner">
              <div className="chat-panel__body">
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Подключение…</p>
              </div>
            </div>
          ) : (
            <ChatPanel sessionId={sessionId} />
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
