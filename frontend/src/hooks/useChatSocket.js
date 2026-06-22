import { useEffect, useRef, useState } from 'react';
import apiClient from '../api/client.js';

function buildWsUrl(path) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const token = localStorage.getItem('atm-access-token') || '';
  return `${protocol}//${window.location.host}${path}?token=${encodeURIComponent(token)}`;
}

/** Один WebSocket на одну ChatSession — подгружает историю по REST, дальше
 * живёт сообщениями из сокета (см. apps/support_chat/consumers.py).
 *
 * `sessionId` может быть `null` ("черновик" — пользователь открыл виджет
 * поддержки, но ещё ничего не написал). В этом случае сокет не открывается
 * и ничего не создаётся на бэкенде — иначе случайный клик по кнопке
 * поддержки плодил бы пустые "мусорные" обращения, которые потом нужно
 * было бы вручную завершать. Сессия создаётся лениво, в момент первого
 * реального действия (`send`/`requestDeveloper`), через переданный
 * `createSession()` — см. SupportWidget.jsx. */
export function useChatSocket(initialSessionId, { createSession } = {}) {
  const [sessionId, setSessionId] = useState(initialSessionId || null);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('ai');
  const [rating, setRating] = useState(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const pendingRef = useRef(null);
  const creatingRef = useRef(null);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    apiClient.get(`/support/sessions/${sessionId}/`).then(({ data }) => {
      if (cancelled) return;
      setMessages(data.messages || []);
      setStatus(data.status);
      setRating(data.rating);
    }).catch(() => {});

    const ws = new WebSocket(buildWsUrl(`/ws/chat/${sessionId}/`));
    socketRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      if (pendingRef.current) {
        ws.send(JSON.stringify(pendingRef.current));
        pendingRef.current = null;
      }
    };
    ws.onclose = () => setConnected(false);
    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      setMessages((m) => [...m, payload]);
      if (payload.sender === 'system' && payload.body.includes('Подключился разработчик')) {
        setStatus('with_developer');
      }
      if (payload.sender === 'system' && payload.body.includes('завершён')) {
        setStatus('closed');
      }
    };

    return () => {
      cancelled = true;
      ws.close();
    };
  }, [sessionId]);

  // создаёт сессию на бэкенде по требованию (первое сообщение/запрос
  // разработчика в "черновике"), не дублирует запрос при параллельных вызовах
  const ensureSession = () => {
    if (sessionId) return Promise.resolve(sessionId);
    if (!createSession) return Promise.resolve(null);
    if (!creatingRef.current) {
      creatingRef.current = createSession()
        .then((session) => {
          setSessionId(session.id);
          return session.id;
        })
        .finally(() => { creatingRef.current = null; });
    }
    return creatingRef.current;
  };

  const send = (body) => {
    if (!sessionId) {
      pendingRef.current = { type: 'message', body };
      ensureSession();
      return;
    }
    socketRef.current?.readyState === WebSocket.OPEN
      && socketRef.current.send(JSON.stringify({ type: 'message', body }));
  };

  const requestDeveloper = (category) => {
    if (!sessionId) {
      pendingRef.current = { type: 'request_developer', category };
      ensureSession();
      setStatus('waiting_developer');
      return;
    }
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'request_developer', category }));
      setStatus('waiting_developer');
    }
  };

  const closeSession = () => {
    socketRef.current?.readyState === WebSocket.OPEN
      && socketRef.current.send(JSON.stringify({ type: 'close_session' }));
  };

  const submitRating = async (value, review) => {
    const { data } = await apiClient.post(`/support/sessions/${sessionId}/rate/`, { rating: value, review });
    setRating(data.rating);
    return data;
  };

  return {
    messages, status, rating, connected,
    hasSession: !!sessionId,
    send, requestDeveloper, closeSession, submitRating,
  };
}
