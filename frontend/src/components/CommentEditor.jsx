import { EditorContent, useEditor } from '@tiptap/react';
import { Mark } from '@tiptap/core';
import Link from '@tiptap/extension-link';
import StarterKit from '@tiptap/starter-kit';
import React, { useEffect, useRef, useState } from 'react';

// кэш «файл → строки» на время жизни страницы — несколько ссылок на один
// и тот же файл в разных комментариях не должны качать его заново
const fileLinesCache = new Map();

async function fetchLines(attachment) {
  if (!fileLinesCache.has(attachment.id)) {
    fileLinesCache.set(attachment.id, fetch(attachment.file).then((r) => r.text()).then((t) => t.split('\n')));
  }
  return fileLinesCache.get(attachment.id);
}

/** Кастомная Tiptap-метка для ссылки «на строки файла» — отдельно от обычного
 * Link, потому что несёт служебные data-атрибуты (id вложения, диапазон
 * строк) и рендерится/распознаётся по своему классу comment-ref-link. */
const CodeRefMark = Mark.create({
  name: 'codeRef',
  addAttributes() {
    return {
      attachment: { default: null },
      startLine: { default: null },
      endLine: { default: null },
    };
  },
  parseHTML() {
    return [{
      tag: 'a.comment-ref-link',
      getAttrs: (el) => ({
        attachment: el.getAttribute('data-ref-attachment'),
        startLine: el.getAttribute('data-ref-start'),
        endLine: el.getAttribute('data-ref-end'),
      }),
    }];
  },
  renderHTML({ mark }) {
    return ['a', {
      href: '#',
      class: 'comment-ref-link',
      'data-ref-attachment': mark.attrs.attachment,
      'data-ref-start': mark.attrs.startLine,
      'data-ref-end': mark.attrs.endLine,
    }, 0];
  },
});

function LinkPanel({ editor, onClose }) {
  const [url, setUrl] = useState(editor.getAttributes('link').href || '');

  const apply = () => {
    const trimmed = url.trim();
    if (trimmed) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: trimmed, target: '_blank' }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    onClose();
  };

  const remove = () => {
    editor.chain().focus().unsetLink().run();
    onClose();
  };

  return (
    <div className="tiptap-link-panel">
      <input
        type="text"
        autoFocus
        placeholder="https://…"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); apply(); }
          if (e.key === 'Escape') onClose();
        }}
      />
      <button type="button" className="btn btn-secondary" onMouseDown={(e) => e.preventDefault()} onClick={apply}>Вставить</button>
      {editor.isActive('link') && (
        <button type="button" className="btn btn-secondary" onMouseDown={(e) => e.preventDefault()} onClick={remove}>Убрать</button>
      )}
      <button type="button" className="tiptap-link-panel__close" onMouseDown={(e) => e.preventDefault()} onClick={onClose} title="Отмена">✕</button>
    </div>
  );
}

/** Список приложенных файлов с быстрым копированием имени — чтобы написать
 * правильную конструкцию "имя_файла:строка", сначала нужно точно знать само
 * имя файла, а вспоминать/перепечатывать его руками неудобно. */
function FilesMenu({ attachments }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  const copy = async (name) => {
    try {
      await navigator.clipboard.writeText(name);
    } catch {
      // буфер обмена недоступен (старый браузер/нет разрешения) — молча игнорируем
    }
    setCopied(name);
    setTimeout(() => setCopied((c) => (c === name ? null : c)), 1200);
  };

  return (
    <div className="comment-editor__files" ref={ref}>
      <button
        type="button"
        className="tiptap-toolbar__btn"
        onMouseDown={(e) => { e.preventDefault(); setOpen((o) => !o); }}
        title="Приложенные файлы — скопировать точное имя для ссылки"
      >
        📋 файлы
      </button>
      {open && (
        <div className="comment-editor__files-menu">
          {attachments.map((a) => (
            <button
              key={a.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => copy(a.original_name)}
            >
              <span>{a.original_name}</span>
              <span className="comment-editor__files-hint">{copied === a.original_name ? '✓ скопировано' : 'копировать'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Toolbar({ editor, attachments, status, onStatus }) {
  const [linkOpen, setLinkOpen] = useState(false);
  if (!editor) return null;

  const btn = (active, onClick, label, title) => (
    <button
      type="button"
      className={`tiptap-toolbar__btn ${active ? 'tiptap-toolbar__btn--active' : ''}`}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
    >
      {label}
    </button>
  );

  const makeCodeRef = async () => {
    const { state } = editor;
    const { from, to } = state.selection;
    const selected = state.doc.textBetween(from, to, ' ').trim();
    const match = selected.match(/^(\S+):(\d+)(?:-(\d+))?$/);
    if (!match) {
      onStatus('Выделите текст вида file.atm:12 или file.atm:12-20, потом нажмите эту кнопку.');
      return;
    }
    const [, filename, startStr, endStr] = match;
    const start = Number(startStr);
    const end = endStr ? Number(endStr) : start;
    if (end < start) {
      onStatus('Конечная строка меньше начальной.');
      return;
    }
    const attachment = attachments?.find((a) => a.original_name === filename);
    if (!attachment) {
      onStatus(`Файл «${filename}» не приложен к этому посту.`);
      return;
    }
    onStatus('Проверяю файл…');
    try {
      const lines = await fetchLines(attachment);
      if (start < 1 || end > lines.length) {
        onStatus(`В файле «${filename}» всего ${lines.length} строк — диапазон ${start}-${end} выходит за пределы.`);
        return;
      }
    } catch {
      onStatus('Не удалось проверить файл — попробуйте ещё раз.');
      return;
    }
    editor.chain().focus().setMark('codeRef', { attachment: attachment.id, startLine: start, endLine: end }).run();
    onStatus(null);
  };

  return (
    <>
      <div className="tiptap-toolbar">
        {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), 'B', 'Полужирный')}
        {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), 'I', 'Курсив')}
        {btn(editor.isActive('code'), () => editor.chain().focus().toggleCode().run(), '</>', 'Код')}
        {btn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), '•', 'Список')}
        {btn(editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run(), '"', 'Цитата')}
        {btn(editor.isActive('link') || linkOpen, () => setLinkOpen((o) => !o), '🔗', 'Ссылка')}
        {btn(false, () => editor.chain().focus().unsetAllMarks().run(), '🧹', 'Очистить форматирование выделенного текста')}
        {attachments?.length > 0 && btn(
          false, makeCodeRef, '⌁',
          'Выделите в тексте "имя_файла:строка" или "имя_файла:строка1-строка2" и нажмите — получится ссылка на код',
        )}
        {attachments?.length > 0 && <FilesMenu attachments={attachments} />}
      </div>
      {linkOpen && <LinkPanel editor={editor} onClose={() => setLinkOpen(false)} />}
      {status && <p className="comment-editor__status">{status}</p>}
    </>
  );
}

/** Редактор текста комментария — тот же Tiptap-тулбар, что у блоков поста
 * (B/I/код/список/цитата/ссылка), плюс кнопка ⌁: выделяешь в тексте
 * конструкцию "main.atm:12" или "main.atm:12-20" и превращаешь её в
 * настоящую кликабельную ссылку на эти строки кода (с проверкой, что файл
 * приложен к посту и что такие строки в нём существуют). Ссылок в одном
 * комментарии может быть сколько угодно — это просто часть текста, а не
 * отдельная структура с лимитом. */
export default function CommentEditor({ onChange, attachments }) {
  const [status, setStatus] = useState(null);
  const editor = useEditor({
    extensions: [StarterKit, Link.configure({ openOnClick: false }), CodeRefMark],
    content: '',
    onUpdate: ({ editor: e }) => onChange(e.getHTML(), e.isEmpty),
  });

  return (
    <div className="tiptap-block comment-editor">
      <Toolbar editor={editor} attachments={attachments} status={status} onStatus={setStatus} />
      <EditorContent editor={editor} className="tiptap-block__content" />
    </div>
  );
}
