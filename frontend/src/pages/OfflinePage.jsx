import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/error.css';
import ErrorParticles from '../components/ErrorParticles.jsx';

export default function OfflinePage() {
  return (
    <div className="error-page">
      <ErrorParticles count={14} />
      <div className="error-icon error-icon--pulse">📡</div>
      <div className="error-code" style={{ fontSize: '4rem', marginTop: '0.5rem' }}>503</div>
      <h2 className="error-title">Бэкенд временно не отвечает</h2>
      <p className="error-text">
        Не получилось достучаться до сервера — возможно, он перезапускается
        или сеть нестабильна. Попробуй обновить страницу через несколько секунд.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          ↻ Обновить
        </button>
        <Link to="/" className="btn btn-secondary">
          На главную
        </Link>
      </div>
    </div>
  );
}
