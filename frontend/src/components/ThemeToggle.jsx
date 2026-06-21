import React from 'react';
import { useTheme } from '../theme/ThemeContext.jsx';

export default function ThemeToggle({ className = '', style }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button className={`theme-toggle ${className}`} style={style} onClick={toggleTheme}>
      {theme === 'dark' ? '☀️ Светлая' : '🌙 Тёмная'}
    </button>
  );
}
