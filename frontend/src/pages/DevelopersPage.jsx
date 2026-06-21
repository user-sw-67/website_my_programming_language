import React, { useEffect, useState } from 'react';
import apiClient from '../api/client.js';

const LEVEL_LABEL = { junior: 'Junior', middle: 'Middle', senior: 'Senior' };

export default function DevelopersPage() {
  const [developers, setDevelopers] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      apiClient.get('/auth/developers/', { params: search ? { search } : {} })
        .then(({ data }) => setDevelopers(Array.isArray(data) ? data : data.results || []))
        .catch(() => setDevelopers([]));
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div>
      <div className="eyebrow">команда atom</div>
      <h1 style={{ marginTop: 0 }}>Разработчики</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
        Найдите разработчика по имени или уникальному ключу (например, <code>ATM-XXXXXXXX</code>).
      </p>

      <input
        type="text"
        placeholder="Поиск по имени или ключу…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: '100%', maxWidth: 360, marginBottom: '1.5rem' }}
      />

      {developers === null && <p style={{ color: 'var(--text-secondary)' }}>Загрузка…</p>}
      {developers && developers.length === 0 && (
        <p style={{ color: 'var(--text-secondary)' }}>Никого не нашлось.</p>
      )}

      <div className="card-grid">
        {developers && developers.map((d) => (
          <div key={d.id} className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
              <span className="profile-chip__avatar" style={{ width: 36, height: 36, fontSize: '1rem' }}>
                {d.username.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <strong>{d.username}</strong>
                {d.developer_level && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {LEVEL_LABEL[d.developer_level]}
                  </div>
                )}
              </div>
            </div>
            {d.bio && <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0 0 0.6rem' }}>{d.bio}</p>}
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {d.developer_key}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
