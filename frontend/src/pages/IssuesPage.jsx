import React, { useEffect, useState } from 'react';
import apiClient from '../api/client.js';

const DEMO_ISSUES = [
  { id: 'demo-1', title: 'Падение при вложенном use в цикле импорта', severity: 'critical', status: 'open' },
  { id: 'demo-2', title: 'Неочевидное сообщение об ошибке типов в make', severity: 'unclear', status: 'in_progress' },
  { id: 'demo-3', title: 'Опечатка в сообщении про break вне цикла', severity: 'minor', status: 'resolved' },
];

const SEVERITY_LABEL = { critical: 'Критическая', unclear: 'Непонятная', minor: 'Незначительная' };
const STATUS_LABEL = { open: 'Открыта', in_progress: 'В работе', resolved: 'Решена' };

export default function IssuesPage() {
  const [issues, setIssues] = useState(null);

  useEffect(() => {
    apiClient.get('/issues/')
      .then(({ data }) => setIssues(Array.isArray(data) ? data : data.results || []))
      .catch(() => setIssues(DEMO_ISSUES));
  }, []);

  return (
    <div>
      <h1>Проблемы и баги</h1>
      <p style={{ color: 'var(--text-secondary)' }}>
        Сводный список багов сообщества — раздел для разработчиков. Чтобы сообщить о своей проблеме,
        используйте профиль (вкладка «Мои баги и проблемы»).
      </p>

      {issues === null && <p style={{ color: 'var(--text-secondary)' }}>Загрузка…</p>}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {issues && issues.map((issue, i) => (
          <div
            key={issue.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem 1.25rem',
              borderBottom: i < issues.length - 1 ? '1px solid var(--border)' : 'none',
            }}
          >
            <span>{issue.title}</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span className={`badge badge--severity-${issue.severity}`}>{SEVERITY_LABEL[issue.severity]}</span>
              <span className="badge">{STATUS_LABEL[issue.status]}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
