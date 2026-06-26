import React, { useState } from 'react';

/** Звёздный рейтинг 1-5. В readonly-режиме просто отображает среднее
 * (avg_rating может быть дробным — отрисовывается округлением вниз для
 * целых звёзд). В interactive-режиме показывает текущую оценку пользователя
 * (value) и позволяет выбрать новую через onRate(score). */
export default function StarRating({ value = 0, count, interactive = false, onRate, size = 18 }) {
  const [hover, setHover] = useState(0);
  const display = interactive ? (hover || value) : value;

  return (
    <span className="star-rating" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`star-rating__star ${n <= Math.round(display) ? 'star-rating__star--filled' : ''} ${interactive ? 'star-rating__star--interactive' : ''}`}
          onMouseEnter={interactive ? () => setHover(n) : undefined}
          onMouseLeave={interactive ? () => setHover(0) : undefined}
          onClick={interactive ? () => onRate?.(n) : undefined}
        >
          ★
        </span>
      ))}
      {typeof count === 'number' && (
        <span className="star-rating__count">
          {value ? value.toFixed(1) : '—'} {count > 0 && `(${count})`}
        </span>
      )}
    </span>
  );
}
