import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle.jsx';
import AuthModal from './AuthModal.jsx';
import Avatar from './Avatar.jsx';
import { LoginBootAnimation, LogoutCrashAnimation } from './TerminalFx.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { useTheme } from '../theme/ThemeContext.jsx';
import { displayName } from '../utils/userDisplay.js';
import '../styles/header.css';

// группировка согласована с пользователем (лаборатория /header-lab, вариант
// 11 «Голотерминал»): три самых частых раздела видны прямо в шапке,
// остальные — в двух тематических выпадающих меню вместо горизонтального
// скролла. «История»/«Форум» переименованы в «Анатомия ATOM»/«Сообщество» —
// см. ## Составляющие страниц в CLAUDE.md, маршруты не менялись
const MAIN_LINKS = [
  { to: '/', label: 'Главная' },
  { to: '/news', label: 'Новости' },
  { to: '/editor', label: 'Редактор' },
];

const EXPLORE_GROUP = {
  label: 'Изучить',
  links: [
    { to: '/docs', label: 'Документация' },
    { to: '/learn', label: 'Анатомия ATOM' },
  ],
};

const COMMUNITY_GROUP = {
  label: 'Сообщество',
  links: [
    { to: '/forum', label: 'Сообщество' },
    { to: '/repositories', label: 'Проекты' },
    { to: '/reviews', label: 'Отзывы' },
  ],
};

/** Переключатель темы — ползунок с двумя иконками вместо текстовой кнопки
 * (выбран в лаборатории хедеров вместе с остальным стилем шапки). */
function ThemeSwitch({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button className={`theme-switch ${className}`} onClick={toggleTheme} aria-label="Переключить тему" title="Переключить тему">
      <span className="theme-switch__icon theme-switch__icon--sun">☀</span>
      <span className="theme-switch__icon theme-switch__icon--moon">☾</span>
      <span className={`theme-switch__thumb theme-switch__thumb--${theme}`} />
    </button>
  );
}

function NavGroupDropdown({ label, links, onHoverMove }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const location = useLocation();
  const isActive = links.some((l) => l.to === location.pathname);
  const key = (l) => l.to || l.href;

  useEffect(() => {
    if (!open) return;
    const onOutside = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <div className="header__navgroup" ref={ref}>
      <button
        type="button"
        className={`header__navlink ${isActive ? 'active' : ''}`}
        onMouseEnter={(e) => onHoverMove(e.currentTarget)}
        onClick={(e) => { onHoverMove(e.currentTarget); setOpen((o) => !o); }}
      >
        <span className="header__navlink-prompt">&gt;</span>{label}
        <span className={`header__group-caret ${open ? 'is-open' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="header__dropdown">
          {links.map((l) => (
            l.href ? (
              <a
                key={key(l)}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="header__dropdown-item"
                onClick={() => setOpen(false)}
              >
                <span className="header__navlink-prompt">&gt;</span>{l.label}
              </a>
            ) : (
              <NavLink
                key={key(l)}
                to={l.to}
                className={({ isActive: active }) => `header__dropdown-item ${active ? 'active' : ''}`}
                onClick={() => setOpen(false)}
              >
                <span className="header__navlink-prompt">&gt;</span>{l.label}
              </NavLink>
            )
          ))}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { user, loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [transition, setTransition] = useState(null); // 'login' | 'logout' | null
  const navigate = useNavigate();
  const location = useLocation();
  const frameRef = useRef(null);
  const navRef = useRef(null);
  const wasAuthed = useRef(false);
  const [hl, setHl] = useState({ left: 0, width: 0, opacity: 0 });

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

  // переход гость → аккаунт и обратно проигрывает терминальную анимацию
  // прямо в самой шапке (она и так стилизована под терминал) — выбрано и
  // согласовано в лаборатории хедеров
  useEffect(() => {
    if (loading) return;
    // (!) Раньше тут был откат wasAuthed.current в cleanup — это "лечило"
    // зависание после StrictMode-двойного монтирования, но ломало ЛЮБОЙ
    // следующий настоящий переход (например, выход из аккаунта): React
    // вызывает cleanup предыдущего запуска эффекта перед КАЖДЫМ новым
    // запуском (не только при синтетическом StrictMode-перемонтировании),
    // и откат рефа из старого cleanup портил wasAuthed прямо перед тем, как
    // логика выхода успевала его прочитать. Корень исходного зависания был
    // не здесь, а в AuthContext.jsx (см. cancelledRef там) — с тем фиксом
    // эта функция снова может быть простой.
    if (!wasAuthed.current && user) {
      setTransition('login');
      // таймлайн LoginBootAnimation: 600 + 350*2 = 1300мс до последней строки
      // ("mounting profile... OK") — даём ей повисеть ~650мс, чтобы успеть
      // прочитать, и сразу после возвращаем обычное меню (без промежуточного
      // кадра с аватаром, который тут раньше был, — убран по запросу)
      const t = setTimeout(() => setTransition(null), 1950);
      wasAuthed.current = true;
      return () => clearTimeout(t);
    }
    if (wasAuthed.current && !user) {
      setTransition('logout');
      // таймлайн LogoutCrashAnimation: 280*3 = 840мс до глитча, ещё 0.6с до
      // начала схлопывания и 0.4с на сам коллапс — итого ~1840мс
      const t = setTimeout(() => setTransition(null), 2000);
      wasAuthed.current = false;
      return () => clearTimeout(t);
    }
    wasAuthed.current = !!user;
  }, [user, loading]);

  // позицию блика отслеживаем по всему окну (чтобы он не "телепортировался"
  // рывком в точку входа курсора), но саму подсветку показываем только пока
  // курсор реально находится над шапкой — за её пределами она плавно гаснет
  useEffect(() => {
    const onMove = (e) => {
      const el = frameRef.current;
      if (!el) return;
      const box = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${((e.clientX - box.left) / box.width) * 100}%`);
      const inside = e.clientX >= box.left && e.clientX <= box.right && e.clientY >= box.top && e.clientY <= box.bottom;
      el.style.setProperty('--sheen-opacity', inside ? '1' : '0');
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const moveHighlight = (el) => {
    if (!el || !navRef.current) return;
    const navBox = navRef.current.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    setHl({ left: box.left - navBox.left, width: box.width, opacity: 1 });
  };

  const goProfile = () => {
    setMenuOpen(false);
    navigate('/profile');
  };

  // «Разработчикам» — ссылка на Swagger (внешний путь /api/docs/, не React-роут)
  // видна всем, «Центр управления» (бывшая «Админка», название согласовано с
  // пользователем) — только тем, кто реально авторизован как разработчик языка
  const adminLink = user?.is_developer ? { to: '/admin-panel', label: 'Центр управления' } : null;
  const developerGroupLinks = [
    { to: '/rest-api', label: 'API' },
    ...(adminLink ? [adminLink] : []),
  ];
  const mobileLinks = [
    ...MAIN_LINKS, ...EXPLORE_GROUP.links, ...COMMUNITY_GROUP.links,
    ...developerGroupLinks,
  ];

  return (
    <header className="header" ref={frameRef}>
      <span className="header__sheen" />
      <div className="header__titlebar">
        <span className="header__dot header__dot--a" />
        <span className="header__dot header__dot--b" />
        <span className="header__dot header__dot--c" />
        <span className="header__titlebar-name">atom — powershell</span>
      </div>

      <div className="header__row">
        <Link to="/" className="header__logo">
          &gt;&gt;&gt; ATOM
          <span className="header__logo-caret" />
        </Link>

        {transition === 'login' ? (
          <div className="header__termfx"><LoginBootAnimation /></div>
        ) : transition === 'logout' ? (
          <div className="header__termfx"><LogoutCrashAnimation /></div>
        ) : (
          <>
            <nav className="header__nav" ref={navRef} onMouseLeave={() => setHl((h) => ({ ...h, opacity: 0 }))}>
              <span className="header__cursor" style={{ transform: `translateX(${hl.left}px)`, width: hl.width, opacity: hl.opacity }} />
              {MAIN_LINKS.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) => `header__navlink ${isActive ? 'active' : ''}`}
                  onMouseEnter={(e) => moveHighlight(e.currentTarget)}
                >
                  <span className="header__navlink-prompt">&gt;</span>{l.label}
                </NavLink>
              ))}
              <NavGroupDropdown label={EXPLORE_GROUP.label} links={EXPLORE_GROUP.links} onHoverMove={moveHighlight} />
              <NavGroupDropdown label={COMMUNITY_GROUP.label} links={COMMUNITY_GROUP.links} onHoverMove={moveHighlight} />
              <NavGroupDropdown label="Разработчикам" links={developerGroupLinks} onHoverMove={moveHighlight} />
            </nav>

            <div className="header__actions">
              <ThemeSwitch className="header__theme" />
              {!loading && (
                user ? (
                  <button className="header__user" onClick={goProfile}>
                    <Avatar user={user} size={26} />
                    <span className="header__user-prompt">user@</span>{displayName(user)}
                    <span className="header__user-caret" />
                  </button>
                ) : (
                  <button className="header__cta" onClick={() => setAuthOpen(true)}>Войти</button>
                )
              )}
            </div>
          </>
        )}

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
            {!loading && (
              user ? (
                <button className="mobile-drawer__profile" onClick={goProfile}>
                  <Avatar user={user} size={26} />
                  <span className="mobile-drawer__profile-name">{displayName(user)}</span>
                </button>
              ) : (
                // без этого у анонимного пользователя на мобильном не было
                // вообще никакой возможности войти — header__cta скрыт по
                // ширине, а в самом меню кнопки входа не было (реальный баг)
                <button className="mobile-drawer__profile" onClick={() => { setMenuOpen(false); setAuthOpen(true); }}>
                  Войти
                </button>
              )
            )}

            {mobileLinks.map((link, i) => (
              link.href ? (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  {link.label}
                </a>
              ) : (
                <NavLink
                  key={link.to}
                  to={link.to}
                  style={{ animationDelay: `${i * 0.04}s` }}
                  className={({ isActive }) => (isActive ? 'active' : undefined)}
                >
                  {link.label}
                </NavLink>
              )
            ))}

            <ThemeToggle
              className="mobile-drawer__theme"
              style={{ animationDelay: `${mobileLinks.length * 0.04}s` }}
            />
          </nav>
        </div>,
        document.body,
      )}

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </header>
  );
}
