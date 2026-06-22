import React from 'react';
import { avatarInitial, displayName } from '../utils/userDisplay.js';
import '../styles/avatar.css';

/** Единая аватарка-шестиугольник — картинка (если задан avatar_url) либо
 * инициал отображаемого имени на градиентном фоне. Используется везде, где
 * на сайте показывается пользователь (шапка, профиль, форум, новости,
 * каталог разработчиков, админка) — не изобретай свою разметку аватарки. */
export default function Avatar({ user, size = 36, className = '' }) {
  const name = displayName(user);
  const src = user?.avatar_url;
  return (
    <span
      className={`avatar-hex ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      title={name || undefined}
    >
      {src ? <img src={src} alt={name} /> : avatarInitial(user)}
    </span>
  );
}
