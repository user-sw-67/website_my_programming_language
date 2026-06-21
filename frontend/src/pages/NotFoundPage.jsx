import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/error.css';
import ErrorParticles from '../components/ErrorParticles.jsx';

export default function NotFoundPage() {
  return (
    <div className="error-page">
      <ErrorParticles />
      <div className="error-code error-code--glitch" data-text="404">404</div>
      <h2 className="error-title">Страница потерялась в AST</h2>
      <p className="error-text">
        Похоже, парсер не нашёл узел по этому пути. Возможно, страница переехала
        или адрес введён с ошибкой.
      </p>
      <Link to="/" className="btn btn-primary" style={{ marginTop: '1.25rem' }}>
        ← На главную
      </Link>
    </div>
  );
}
