import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import PostBlockEditor, { EMPTY_POST_BLOCK } from '../components/editor-blocks/PostBlockEditor.jsx';
import TerminalDropdown from '../components/TerminalDropdown.jsx';
import '../styles/admin.css';
import '../styles/reactor.css';

const ALLOWED_EXTENSIONS = ['atm', 'txt', 'md', 'py', 'js', 'jsx', 'ts', 'tsx', 'cpp', 'cc', 'c', 'h', 'hpp', 'json', 'csv', 'log', 'yaml', 'yml', 'ini', 'cfg', 'sh'];

export default function ReactorCreatePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [blocks, setBlocks] = useState([{ ...EMPTY_POST_BLOCK }]);
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState(null);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiClient.get('/forum/categories/').then(({ data }) => setCategories(Array.isArray(data) ? data : data.results || [])).catch(() => {});
  }, []);

  const onFilesChosen = (fileList) => {
    setFileError(null);
    const chosen = Array.from(fileList).slice(0, 5 - files.length);
    const rejected = [];
    const accepted = chosen.filter((f) => {
      const ext = f.name.includes('.') ? f.name.split('.').pop().toLowerCase() : '';
      const ok = ALLOWED_EXTENSIONS.includes(ext) && f.size <= 200 * 1024;
      if (!ok) rejected.push(f.name);
      return ok;
    });
    if (rejected.length) setFileError(`Не удалось приложить: ${rejected.join(', ')} (только текст/код до 200 КБ).`);
    setFiles((list) => [...list, ...accepted].slice(0, 5));
  };

  const removeFile = (name) => setFiles((list) => list.filter((f) => f.name !== name));

  const submit = async (e) => {
    e.preventDefault();
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    const cleanBlocks = blocks.map((b) => ({ text: b.text.trim(), image: b.image.trim() })).filter((b) => b.text);
    setBusy(true);
    setStatus(null);
    try {
      const { data: topic } = await apiClient.post('/forum/topics/', {
        title,
        summary,
        tags,
        category_id: categoryId || null,
        github_url: githubUrl,
        blocks: cleanBlocks,
      });

      for (const file of files) {
        const form = new FormData();
        form.append('topic', topic.id);
        form.append('file', file);
        // eslint-disable-next-line no-await-in-loop
        await apiClient.post('/forum/attachments/upload/', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      }

      navigate(`/forum/${topic.slug}`);
    } catch (err) {
      const data = err.response?.data;
      const text = data?.detail || data?.title?.[0] || data?.blocks?.[0] || 'Не удалось опубликовать пост — проверьте поля.';
      setStatus({ ok: false, text });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return null;

  if (!user) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <h2>Нужно войти</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Создавать посты в Реакторе могут только авторизованные пользователи.</p>
        <Link to="/forum" className="btn btn-primary">← В Реактор</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div>
        <Link to="/profile?tab=reactor" className="topic-detail__back">← В профиль</Link>
      </div>
      <div className="eyebrow">новый пост · реактор</div>
      <h1 style={{ marginTop: 0 }}>Создать пост</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
        Не чаще одного поста в 6 часов на аккаунт.
      </p>

      <form onSubmit={submit} className="card">
        <div className="news-form-grid">
          <div className="profile-field">
            <label>Название</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="profile-field">
            <label>Категория</label>
            <TerminalDropdown
              className="reactor-create__category-dropdown"
              value={categoryId}
              options={[{ value: '', label: 'Без категории', icon: '🗂️' }, ...categories.map((c) => ({ value: String(c.id), label: c.name, icon: '📁' }))]}
              onChange={setCategoryId}
            />
          </div>
        </div>

        <div className="profile-field">
          <label>Описание статьи ({summary.length}/160)</label>
          <input type="text" maxLength={160} required placeholder="Пара предложений — что в посте, для строки в ленте" value={summary} onChange={(e) => setSummary(e.target.value)} />
        </div>

        <div className="news-form-grid">
          <div className="profile-field">
            <label>Теги (через запятую)</label>
            <input type="text" placeholder="func, args" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />
          </div>
          <div className="profile-field">
            <label>Ссылка на GitHub (необязательно)</label>
            <input type="text" placeholder="https://github.com/…" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} />
          </div>
        </div>

        <PostBlockEditor blocks={blocks} onChange={setBlocks} />

        <div className="profile-field" style={{ marginTop: '1rem' }}>
          <label>Файлы с кодом (необязательно, до 5, только текст/код, ≤200 КБ)</label>
          <label className="news-image-input__dropzone">
            <input type="file" multiple disabled={files.length >= 5} onChange={(e) => onFilesChosen(e.target.files)} />
            Нажмите, чтобы выбрать файлы
          </label>
          {fileError && <p style={{ color: 'var(--danger)', fontSize: '0.78rem' }}>{fileError}</p>}
          {files.length > 0 && (
            <div className="reactor-create__files">
              {files.map((f) => (
                <span key={f.name} className="badge">
                  {f.name} <button type="button" onClick={() => removeFile(f.name)}>✕</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {status && <p style={{ color: status.ok ? 'var(--accent)' : 'var(--danger)', fontSize: '0.85rem' }}>{status.text}</p>}
        <button className="btn btn-primary" disabled={busy} style={{ marginTop: '1rem' }}>
          {busy ? <span className="skeleton-spin" /> : 'Опубликовать'}
        </button>
      </form>
    </div>
  );
}
