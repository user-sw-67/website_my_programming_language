import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle.jsx';
import AuthModal from './AuthModal.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

// порядок и названия согласованы с пользователем — см. ## Составляющие
// страниц в CLAUDE.md (нумерация 0..7); «История»/«Форум» переименованы
// в более полные «Анатомия ATOM»/«Сообщество», без смены маршрутов
const links = [
  { to: '/', label: 'Главная' },
  { to: '/news', label: 'Новости' },
  { to: '/editor', label: 'Редактор' },
  { to: '/docs', label: 'Документация' },
  { to: '/learn', label: 'Анатомия ATOM' },
  { to: '/forum', label: 'Сообщество' },
  { to: '/repositories', label: 'Проекты' },
  { to: '/reviews', label: 'Отзывы' },
];

export default function Header() {
  const { user, loading, logout } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const goProfile = () => {
    setMenuOpen(false);
    navigate('/profile');
  };

  const visibleLinks = user?.is_developer ? [...links, { to: '/admin-panel', label: 'Админка' }] : links;

  return (
    <header className="header">
      <Link to="/" className="header__logo" style={{ color: 'inherit' }}>
        <span className="header__logo-mark" />
        <span className="header__logo-text">ATOM</span>
      </Link>

      <nav className="header__nav">
        {visibleLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="header__actions">
        {!loading && (
          user ? (
            <div className="profile-chip">
              <button className="profile-chip__btn" onClick={goProfile}>
                <span className="profile-chip__avatar">{user.username.slice(0, 1).toUpperCase()}</span>
                <span className="profile-chip__name">{user.username}</span>
              </button>
              <button className="auth-trigger auth-trigger--ghost header__logout" onClick={logout}>Выйти</button>
            </div>
          ) : (
            <button className="auth-trigger" onClick={() => setAuthOpen(true)}>Войти</button>
          )
        )}
        <ThemeToggle className="header__theme-toggle" />
        <button
          className={`header__burger ${menuOpen ? 'is-open' : ''}`}
          aria-label="Меню"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span /><span /><span />
        </button>
      </div>

      {menuOpen && createPortal(
        <div className="mobile-drawer-backdrop" onClick={() => setMenuOpen(false)}>
          <nav className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer__head">
              <span className="header__logo-mark" />
              <button className="header__burger is-open" aria-label="Закрыть меню" onClick={() => setMenuOpen(false)}>
                <span /><span /><span />
              </button>
            </div>
            {!loading && user && (
              <button className="mobile-drawer__profile" onClick={goProfile}>
                <span className="profile-chip__avatar">{user.username.slice(0, 1).toUpperCase()}</span>
                <span className="mobile-drawer__profile-name">{user.username}</span>
              </button>
            )}

            {visibleLinks.map((link, i) => (
              <NavLink
                key={link.to}
                to={link.to}
                style={{ animationDelay: `${i * 0.04}s` }}
                className={({ isActive }) => (isActive ? 'active' : undefined)}
              >
                {link.label}
              </NavLink>
            ))}

            <ThemeToggle
              className="mobile-drawer__theme"
              style={{ animationDelay: `${visibleLinks.length * 0.04}s` }}
            />

            {!loading && user && (
              <button
                className="mobile-drawer__logout"
                style={{ animationDelay: `${(visibleLinks.length + 1) * 0.04}s` }}
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
              >
                Выйти
              </button>
            )}
          </nav>
        </div>,
        document.body,
      )}

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </header>
  );
}
