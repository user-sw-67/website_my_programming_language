import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

let initialized = false;

function ensureInit() {
  if (initialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    themeVariables: {
      darkMode: true,
      background: 'transparent',
      primaryColor: '#101b15',
      primaryTextColor: '#e3f3ec',
      primaryBorderColor: '#34d399',
      lineColor: '#34d399',
      fontFamily: 'Inter, sans-serif',
    },
  });
  initialized = true;
}

/** Рендерит .md-артефакт AST: markdown-текст вокруг + ```mermaid```-блок диаграммой. */
export default function MermaidView({ markdown }) {
  const containerRef = useRef(null);
  const [error, setError] = useState(null);

  const mermaidSource = (markdown.match(/```mermaid\n([\s\S]*?)```/) || [])[1];
  const prose = markdown.replace(/```mermaid\n[\s\S]*?```/, '').trim();

  useEffect(() => {
    if (!mermaidSource || !containerRef.current) return;
    ensureInit();
    const id = `mermaid-${Math.random().toString(36).slice(2)}`;
    mermaid.render(id, mermaidSource)
      .then(({ svg }) => {
        if (containerRef.current) containerRef.current.innerHTML = svg;
      })
      .catch((err) => setError(err.message));
  }, [mermaidSource]);

  return (
    <div className="mermaid-view">
      {prose && <div className="mermaid-view__prose">{prose}</div>}
      {error && <p style={{ color: 'var(--danger)' }}>Не удалось отрисовать диаграмму: {error}</p>}
      <div className="mermaid-view__diagram" ref={containerRef} />
    </div>
  );
}
