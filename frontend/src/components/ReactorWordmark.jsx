import React from 'react';
import '../styles/wordmark.css';

function AtomLetter() {
  return (
    <svg className="reactor-wordmark__atom" viewBox="0 0 24 24" width="1em" height="1em">
      <circle cx="12" cy="12" r="2.2" fill="currentColor" />
      <ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="currentColor" strokeWidth="1.3" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="currentColor" strokeWidth="1.3" transform="rotate(120 12 12)" />
    </svg>
  );
}

/** Лого слова «Реактор» в двух видах:
 * - decorated (по умолчанию, заголовок /forum) — терминальный префикс ">_" +
 *   неоновый контур букв + вращающаяся буква «о» — атом.
 * - plain (выпадающее меню шапки) — обычный текст пункта меню без неона и
 *   префикса, только вращающийся атом вместо «о» — чтобы не выбиваться из
 *   остальных пунктов меню по начертанию. */
export default function ReactorWordmark({ size = '1em', className = '', variant = 'decorated' }) {
  const plain = variant === 'plain';
  return (
    <span className={`reactor-wordmark ${plain ? '' : 'reactor-wordmark--decorated'} ${className}`} style={{ fontSize: size }}>
      {!plain && <span className="reactor-wordmark__prefix">&gt;_</span>}
      <span className={plain ? '' : 'reactor-wordmark__neon'}>Реакт</span>
      <AtomLetter />
      <span className={plain ? '' : 'reactor-wordmark__neon'}>р</span>
    </span>
  );
}
