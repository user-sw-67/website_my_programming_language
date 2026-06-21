import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/error.css';
import ErrorParticles from '../components/ErrorParticles.jsx';

export default function ForbiddenPage() {
  return (
    <div className="error-page">
      <ErrorParticles count={10} />
      <div className="error-icon">🔒</div>
      <div className="error-code" style={{ fontSize: '4rem', marginTop: '0.5rem' }}>403</div>
      <h2 className="error-title">Узел AST закрыт для записи</h2>
      <p className="error-text">
        Эта область доступна только разработчикам языка. Если тебе кажется,
        что это ошибка — напиши в чат поддержки.
      </p>
      <Link to="/" className="btn btn-primary" style={{ marginTop: '1.25rem' }}>
        ← На главную
      </Link>
    </div>
  );
}
