import React, { useEffect, useRef, useState } from 'react';

/** Терминал-окно для просмотра прикреплённых к посту файлов — табы по
 * именам файлов + панель с текстом (на основе стиля CodeBlock.jsx, без
 * Monaco — вложения это только текст/код, монако был бы избыточен).
 * jumpTo (опционально) — { attachmentId, startLine, endLine } для подсветки
 * диапазона строк по клику на чип-ссылку из комментария (диапазон может
 * быть из одной строки, если startLine === endLine). */
export default function AttachmentsTerminal({ attachments, jumpTo }) {
  const [activeId, setActiveId] = useState(attachments?.[0]?.id ?? null);
  const [contents, setContents] = useState({});
  const lineRefs = useRef({});

  useEffect(() => {
    if (!attachments?.length) return;
    setActiveId((id) => id ?? attachments[0].id);
  }, [attachments]);

  useEffect(() => {
    if (jumpTo?.attachmentId) setActiveId(jumpTo.attachmentId);
  }, [jumpTo]);

  useEffect(() => {
    const att = attachments?.find((a) => a.id === activeId);
    if (!att || contents[att.id] !== undefined) return;
    fetch(att.file)
      .then((r) => r.text())
      .then((text) => setContents((c) => ({ ...c, [att.id]: text })))
      .catch(() => setContents((c) => ({ ...c, [att.id]: '// не удалось загрузить содержимое файла' })));
  }, [activeId, attachments, contents]);

  useEffect(() => {
    if (!jumpTo?.startLine) return;
    const el = lineRefs.current[jumpTo.startLine];
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [jumpTo, contents]);

  if (!attachments || attachments.length === 0) return null;

  const active = attachments.find((a) => a.id === activeId);
  const text = contents[activeId] ?? 'Загрузка…';
  const lines = text.split('\n');

  return (
    <div className="attachments-terminal">
      <div className="attachments-terminal__chrome">
        <span className="attachments-terminal__dot attachments-terminal__dot--r" />
        <span className="attachments-terminal__dot attachments-terminal__dot--y" />
        <span className="attachments-terminal__dot attachments-terminal__dot--g" />
        <span className="attachments-terminal__title">{active?.original_name}</span>
      </div>
      <div className="attachments-terminal__tabs">
        {attachments.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`attachments-terminal__tab ${a.id === activeId ? 'attachments-terminal__tab--active' : ''}`}
            onClick={() => setActiveId(a.id)}
          >
            {a.original_name}
          </button>
        ))}
      </div>
      <pre className="attachments-terminal__pre">
        {lines.map((line, i) => {
          const lineNo = i + 1;
          const highlighted = jumpTo?.attachmentId === active?.id
            && lineNo >= jumpTo?.startLine && lineNo <= jumpTo?.endLine;
          return (
            <div
              key={lineNo}
              ref={(el) => { lineRefs.current[lineNo] = el; }}
              className={`attachments-terminal__line ${highlighted ? 'attachments-terminal__line--highlight' : ''}`}
            >
              <span className="attachments-terminal__line-no">{lineNo}</span>
              <span>{line}</span>
            </div>
          );
        })}
      </pre>
    </div>
  );
}
