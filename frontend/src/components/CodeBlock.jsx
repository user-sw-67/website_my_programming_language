import React, { useState } from 'react';

export default function CodeBlock({ code, style }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // буфер обмена недоступен (нет HTTPS/разрешения) — молча игнорируем
    }
  };

  return (
    <div className="code-block" style={style}>
      <button className="code-block__copy" onClick={copy} type="button">
        {copied ? '✓ скопировано' : '⧉ копировать'}
      </button>
      <pre className="code-block__pre">{code}</pre>
    </div>
  );
}
