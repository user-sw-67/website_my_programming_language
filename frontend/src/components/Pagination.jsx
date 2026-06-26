import React from 'react';

/** Постраничная навигация — вынесена из NewsPage.jsx, чтобы не дублировать
 * одну и ту же вёрстку в ReactorPage. */
export default function Pagination({ page, totalPages, onChange, className = '' }) {
  if (totalPages <= 1) return null;
  return (
    <div className={`news-pagination ${className}`}>
      <button className="btn btn-secondary" disabled={page <= 1} onClick={() => onChange(1)} title="Первая страница">«</button>
      <button className="btn btn-secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>← Назад</button>
      <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
        Страница {page} из {totalPages}
      </span>
      <button className="btn btn-secondary" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Вперёд →</button>
      <button className="btn btn-secondary" disabled={page >= totalPages} onClick={() => onChange(totalPages)} title="Последняя страница">»</button>
    </div>
  );
}
