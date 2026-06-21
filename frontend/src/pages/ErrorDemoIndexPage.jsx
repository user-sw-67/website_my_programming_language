import React from 'react';
import { Link } from 'react-router-dom';

const DEMOS = [
  { code: '404', title: 'Страница не найдена', text: 'Парсер не нашёл узел по этому пути.' },
  { code: '403', title: 'Доступ запрещён', text: 'Узел AST закрыт для записи.' },
  { code: '500', title: 'Ошибка сервера', text: 'Компилятор споткнулся на бэкенде.' },
  { code: '503', title: 'Сервис недоступен', text: 'Бэкенд временно не отвечает.' },
];

export default function ErrorDemoIndexPage() {
  return (
    <div>
      <div className="eyebrow">витрина ошибок</div>
      <h1 style={{ marginTop: 0 }}>Демо страниц ошибок</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        Технический раздел для проверки оформления — реальные ошибки выглядят так же.
      </p>

      <div className="card-grid">
        {DEMOS.map((d) => (
          <Link key={d.code} to={`/error-demo/${d.code}`} className="card card--interactive" style={{ color: 'inherit' }}>
            <div className="eyebrow" style={{ color: 'var(--accent)' }}>{d.code}</div>
            <h3 style={{ margin: '0.3rem 0 0.4rem' }}>{d.title}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>{d.text}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
