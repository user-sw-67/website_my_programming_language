import React, { useEffect, useRef, useState } from 'react';

/** Мультивыбор тегов в терминальном стиле — компактный триггер вместо
 * "кучи" бейджей: открывает список с чекбоксами, выбранные теги показаны
 * рядом как съёмные чипсы (крестик убирает тег без открытия списка). */
export default function TerminalMultiSelect({ selected, options, onToggle, prefix, placeholder = 'любые', max }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

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

  const atMax = max && selected.length >= max;

  return (
    <div className="terminal-dropdown" ref={ref}>
      <button type="button" className="terminal-dropdown__trigger" onClick={() => setOpen((o) => !o)}>
        {prefix && <span className="terminal-dropdown__prefix">{prefix}</span>}
        {selected.length > 0 ? `${selected.length} выбрано` : placeholder}
        <span className={`terminal-dropdown__caret ${open ? 'open' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="terminal-dropdown__menu terminal-dropdown__menu--scroll">
          {options.length === 0 && <div className="terminal-dropdown__empty">Тегов пока нет</div>}
          {options.map((o) => {
            const isActive = selected.includes(o);
            return (
              <button
                key={o}
                type="button"
                className={`terminal-dropdown__option ${isActive ? 'active' : ''}`}
                disabled={!isActive && atMax}
                onClick={() => onToggle(o)}
              >
                <span className="terminal-dropdown__check">{isActive ? '✓' : ''}</span>#{o}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
