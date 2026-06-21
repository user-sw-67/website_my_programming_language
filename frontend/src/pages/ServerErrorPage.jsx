import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/error.css';
import ErrorParticles from '../components/ErrorParticles.jsx';

export default function ServerErrorPage() {
  return (
    <div className="error-page">
      <ErrorParticles count={12} />
      <div className="error-icon">⚙️💥</div>
      <div className="error-code" style={{ fontSize: '4rem', marginTop: '0.5rem' }}>500</div>
      <h2 className="error-title">Компилятор споткнулся на бэкенде</h2>
      <p className="error-text">
        На сервере произошла непредвиденная ошибка. Мы уже логируем её в
        <code> activitylog</code> — попробуйте обновить страницу чуть позже.
      </p>
      <Link to="/" className="btn btn-primary" style={{ marginTop: '1.25rem' }}>
        ← На главную
      </Link>
    </div>
  );
}
