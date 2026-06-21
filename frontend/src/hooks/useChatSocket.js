import { useEffect, useRef, useState } from 'react';
import apiClient from '../api/client.js';

function buildWsUrl(path) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const token = localStorage.getItem('atm-access-token') || '';
  return `${protocol}//${window.location.host}${path}?token=${encodeURIComponent(token)}`;
}

/** Один WebSocket на одну ChatSession — подгружает историю по REST, дальше
 * живёт сообщениями из сокета (см. apps/support_chat/consumers.py). */
export function useChatSocket(sessionId) {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('ai');
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    apiClient.get(`/support/sessions/${sessionId}/`).then(({ data }) => {
      if (cancelled) return;
      setMessages(data.messages || []);
      setStatus(data.status);
    }).catch(() => {});

    const ws = new WebSocket(buildWsUrl(`/ws/chat/${sessionId}/`));
    socketRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      setMessages((m) => [...m, payload]);
      if (payload.sender === 'system' && payload.body.includes('Подключился разработчик')) {
        setStatus('with_developer');
      }
    };

    return () => {
      cancelled = true;
      ws.close();
    };
  }, [sessionId]);

  const send = (body) => {
    socketRef.current?.readyState === WebSocket.OPEN
      && socketRef.current.send(JSON.stringify({ type: 'message', body }));
  };

  const requestDeveloper = () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'request_developer' }));
      setStatus('waiting_developer');
    }
  };

  return { messages, status, connected, send, requestDeveloper };
}
