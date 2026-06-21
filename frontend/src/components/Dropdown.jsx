import React, { useEffect, useRef, useState } from 'react';

export default function Dropdown({ value, onChange, options, className = '' }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const current = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    if (!open) return;
    const onOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onEscape = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  return (
    <div className={`dropdown ${className}`} ref={rootRef}>
      <button
        type="button"
        className="dropdown__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{current?.label}</span>
        <span className="dropdown__chevron" aria-hidden="true" />
      </button>
      {open && (
        <ul className="dropdown__menu" role="listbox">
          {options.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                className={`dropdown__option ${o.value === value ? 'dropdown__option--active' : ''}`}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
