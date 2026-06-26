import { EditorContent, useEditor } from '@tiptap/react';
import Link from '@tiptap/extension-link';
import StarterKit from '@tiptap/starter-kit';
import React, { useState } from 'react';
import apiClient from '../../api/client.js';

const MAX_BLOCKS = 10;
export const EMPTY_POST_BLOCK = { text: '', image: '' };

/** Окно ввода ссылки — раньше был window.prompt() (нативный, незадекорированный
 * браузерный диалог), теперь обычная панель в стиле остального тулбара,
 * вставляется прямо под кнопками. Открыта/закрыта управляется из Toolbar. */
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
      <button type="button" className="btn btn-secondary" onMouseDown={(e) => e.preventDefault()} onClick={apply}>
        Вставить
      </button>
      {editor.isActive('link') && (
        <button type="button" className="btn btn-secondary" onMouseDown={(e) => e.preventDefault()} onClick={remove}>
          Убрать
        </button>
      )}
      <button type="button" className="tiptap-link-panel__close" onMouseDown={(e) => e.preventDefault()} onClick={onClose} title="Отмена">
        ✕
      </button>
    </div>
  );
}

function Toolbar({ editor }) {
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
      </div>
      {linkOpen && <LinkPanel editor={editor} onClose={() => setLinkOpen(false)} />}
    </>
  );
}

function BlockEditor({ value, onChange }) {
  const editor = useEditor({
    extensions: [StarterKit, Link.configure({ openOnClick: false })],
    content: value,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  return (
    <div className="tiptap-block">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="tiptap-block__content" />
    </div>
  );
}

/** Фото к блоку — ссылка или файл (до 5 МБ), тот же паттерн UI, что у
 * AdminPage::BlockImageInput для новостей, но грузит на /forum/upload-image/ —
 * этот эндпоинт доступен любому автору поста, не только мидл+ разработчикам. */
function BlockImageField({ image, onChange }) {
  const [mode, setMode] = useState('url');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const onFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('image', file);
      const { data } = await apiClient.post('/forum/upload-image/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onChange(data.url);
    } catch (err) {
      setError(err.response?.data?.image?.[0] || 'Не удалось загрузить файл.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="news-image-input" style={{ marginTop: '0.5rem' }}>
      <div className="news-image-input__tabs">
        <button
          type="button"
          className={`news-image-input__tab ${mode === 'url' ? 'news-image-input__tab--active' : ''}`}
          onClick={() => setMode('url')}
        >
          Ссылка
        </button>
        <button
          type="button"
          className={`news-image-input__tab ${mode === 'file' ? 'news-image-input__tab--active' : ''}`}
          onClick={() => setMode('file')}
        >
          Загрузить файл
        </button>
      </div>

      {mode === 'url' ? (
        <input
          type="text"
          placeholder="URL фото к блоку (необязательно)"
          value={image}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <label className="news-image-input__dropzone">
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => onFile(e.target.files?.[0])} />
          {uploading ? 'Загрузка…' : 'Нажмите, чтобы выбрать файл (до 5 МБ)'}
        </label>
      )}
      {error && <p style={{ color: 'var(--danger)', fontSize: '0.78rem', margin: 0 }}>{error}</p>}
      {image && <div className="news-image-input__preview" style={{ backgroundImage: `url(${image})` }} />}
    </div>
  );
}

/** Блоки поста «Реактора» (до 10, фото+текст) — тот же паттерн, что
 * NewsTab::BlockImageInput для новостей, но текстовое поле — Tiptap rich-text
 * вместо обычной textarea (согласовано с пользователем). */
export default function PostBlockEditor({ blocks, onChange }) {
  const updateBlock = (i, patch) => {
    onChange(blocks.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  };
  const addBlock = () => {
    if (blocks.length >= MAX_BLOCKS) return;
    onChange([...blocks, { ...EMPTY_POST_BLOCK }]);
  };
  const removeBlock = (i) => {
    if (blocks.length <= 1) return;
    onChange(blocks.filter((_, idx) => idx !== i));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '0.5rem 0' }}>
        <label style={{ fontWeight: 600 }}>Блоки поста ({blocks.length}/{MAX_BLOCKS})</label>
        <button type="button" className="btn btn-secondary" disabled={blocks.length >= MAX_BLOCKS} onClick={addBlock}>
          + Добавить блок
        </button>
      </div>

      {blocks.map((block, i) => (
        <div key={i} className="news-block-field">
          <div className="news-block-field__head">
            <span className="eyebrow">блок {i + 1}</span>
            {blocks.length > 1 && (
              <button type="button" className="news-block-field__remove" onClick={() => removeBlock(i)} title="Удалить блок">✕</button>
            )}
          </div>
          <BlockEditor value={block.text} onChange={(text) => updateBlock(i, { text })} />
          <BlockImageField image={block.image} onChange={(image) => updateBlock(i, { image })} />
        </div>
      ))}
    </div>
  );
}
