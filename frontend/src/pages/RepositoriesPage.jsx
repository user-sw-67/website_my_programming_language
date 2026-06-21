import React, { useEffect, useState } from 'react';
import apiClient from '../api/client.js';

const DEMO_REPOS = [
  { id: 'demo-1', name: 'atm-json', owner: { username: 'mercedessupov' }, description: 'Минимальный парсер JSON, написанный на ATOM как демонстрация работы со строками и массивами.' },
  { id: 'demo-2', name: 'atm-fizzbuzz', owner: { username: 'guest_dev' }, description: 'Классика для проверки циклов, ветвлений и встроенного модуля @io.' },
  { id: 'demo-3', name: 'atm-calc', owner: { username: 'guest_dev' }, description: 'Калькулятор выражений, показывающий работу с классами и операторными перегрузками.' },
];

export default function RepositoriesPage() {
  const [repos, setRepos] = useState(null);

  useEffect(() => {
    apiClient.get('/projects/items/')
      .then(({ data }) => setRepos(Array.isArray(data) ? data : data.results || []))
      .catch(() => setRepos(DEMO_REPOS));
  }, []);

  return (
    <div>
      <h1>Проекты пользователей</h1>
      <p style={{ color: 'var(--text-secondary)' }}>Репозитории на ATOM с рассказом авторов о том, как всё устроено.</p>

      {repos === null && <p style={{ color: 'var(--text-secondary)' }}>Загрузка…</p>}

      <div className="card-grid">
        {repos && repos.map((r) => (
          <div key={r.id} className="card card--interactive">
            <h3 style={{ margin: '0 0 0.3rem', color: 'var(--accent)' }}>{r.name}</h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
              @{r.owner?.username || 'аноним'}
            </div>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.92rem' }}>{r.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
