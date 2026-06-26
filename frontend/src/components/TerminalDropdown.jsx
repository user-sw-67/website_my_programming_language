import React, { useEffect, useRef, useState } from 'react';

/** Кастомный выпадающий список в стиле терминальной команды (`--sort …`) —
 * замена нативному <select> там, где хочется иконки и тот же визуальный язык,
 * что у остальной строки поиска/фильтров (см. .terminal-dropdown в reactor.css). */
export default function TerminalDropdown({ value, options, onChange, prefix, className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = options.find((o) => o.value === value) || options[0];

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
    <div className={`terminal-dropdown ${className}`} ref={ref}>
      <button type="button" className="terminal-dropdown__trigger" onClick={() => setOpen((o) => !o)}>
        <span className="terminal-dropdown__trigger-label">
          {prefix && <span className="terminal-dropdown__prefix">{prefix}</span>}
          <span className="terminal-dropdown__icon">{current.icon}</span>
          {current.label}
        </span>
        <span className={`terminal-dropdown__caret ${open ? 'open' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="terminal-dropdown__menu">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`terminal-dropdown__option ${o.value === value ? 'active' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false); }}
            >
              <span className="terminal-dropdown__icon">{o.icon}</span>{o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
