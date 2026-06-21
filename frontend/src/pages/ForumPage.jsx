import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client.js';
import CreateTopicModal from '../components/CreateTopicModal.jsx';

const DEMO_TOPICS = [
  { id: 'demo-1', title: 'Как объявить вариативную функцию?', tags: ['func', 'args'], comments: [1, 2], is_resolved: true },
  { id: 'demo-2', title: 'Почему auto не ловит ошибку типа в рантайме?', tags: ['typing', 'gradual'], comments: [1], is_resolved: false },
  { id: 'demo-3', title: 'Наследование классов и метод new()', tags: ['classes', 'oop'], comments: [1, 2, 3], is_resolved: true },
  { id: 'demo-4', title: 'Импорт модуля @array не резолвится', tags: ['modules', 'bug'], comments: [], is_resolved: false },
];

export default function ForumPage() {
  const [topics, setTopics] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    apiClient.get('/forum/topics/')
      .then(({ data }) => setTopics(Array.isArray(data) ? data : data.results || []))
      .catch(() => setTopics(DEMO_TOPICS));
  }, []);

  return (
    <div>
      <div className="forum-header">
        <h1 style={{ margin: 0 }}>Форум сообщества</h1>
        <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>+ Новый вопрос</button>
      </div>

      {topics === null && <p style={{ color: 'var(--text-secondary)' }}>Загрузка…</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        {topics && topics.map((t) => (
          <Link key={t.id} to={`/forum/${t.id}`} className="card card--interactive forum-card" style={{ color: 'inherit' }}>
            <div className="forum-card__count">
              <div className="forum-card__count-num">{t.comments?.length ?? 0}</div>
              <div className="forum-card__count-label">ответов</div>
            </div>
            <div className="forum-card__body">
              <strong>{t.title}</strong>
              <div className="forum-card__tags">
                {(t.tags || []).map((tag) => (
                  <span key={tag} className="badge">#{tag}</span>
                ))}
                {t.is_resolved && <span className="badge badge--solved">решено</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <CreateTopicModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(topic) => setTopics((list) => [topic, ...(list || [])])}
      />
    </div>
  );
}
