import React, { useCallback, useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import JSZip from 'jszip';
import { useSearchParams } from 'react-router-dom';
import Dropdown from '../components/Dropdown.jsx';
import MermaidView from '../components/MermaidView.jsx';
import apiClient from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { useMediaQuery } from '../hooks/useMediaQuery.js';
import { registerAtmLanguage, ATM_LANGUAGE_ID } from '../editor/atmLanguage.js';
import '../styles/editor.css';

const INITIAL_TREE = [
  { id: 'main.atm', type: 'file', name: 'main.atm', content: 'use "@io";\n\nmake x -> Int = 1;\nio.print(x);\n' },
  { id: 'math.atm', type: 'file', name: 'math.atm', content: 'use "@math";\n\nfunc square(n) {\n  return n * n;\n}\n' },
  {
    id: 'utils',
    type: 'folder',
    name: 'utils',
    children: [
      {
        id: 'utils/array_helpers.atm',
        type: 'file',
        name: 'array_helpers.atm',
        content: 'use "@array";\n\nfunc sum(arr) {\n  make total = 0;\n  for (item in arr) {\n    total = total + item;\n  }\n  return total;\n}\n',
      },
    ],
  },
];

const FLAGS = [
  { key: 'generateTokens', flag: '-t', label: 'Токены' },
  { key: 'generateAst', flag: '-a', label: 'Дерево разбора' },
  { key: 'generateIr', flag: '-i', label: 'Промежуточный код (скоро)' },
];

const ARTIFACTS_FOLDER_ID = '__artifacts__';

function insertInto(nodes, parentId, newNode) {
  if (parentId === null) return [...nodes, newNode];
  return nodes.map((n) => {
    if (n.id === parentId && n.type === 'folder') {
      return { ...n, children: [...(n.children || []), newNode] };
    }
    if (n.children) return { ...n, children: insertInto(n.children, parentId, newNode) };
    return n;
  });
}

function removeFrom(nodes, id) {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => (n.children ? { ...n, children: removeFrom(n.children, id) } : n));
}

function buildTreeFromNodes(nodes) {
  const byParent = new Map();
  nodes.forEach((n) => {
    const key = n.parent ?? 'root';
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(n);
  });
  const build = (parentKey) => (byParent.get(parentKey) || []).map((n) => ({
    id: n.id,
    type: n.node_type,
    name: n.name,
    ...(n.node_type === 'folder' ? { children: build(n.id) } : {}),
  }));
  return build('root');
}

function buildArtifactsFolder(artifacts) {
  const children = [];
  Object.entries(artifacts || {}).forEach(([filename, data]) => {
    if (data.tokens) children.push({ id: `__artifact__:${filename}:tokens`, type: 'file', name: `${filename}.tokens.txt`, locked: true });
    if (data.ast_pre) children.push({ id: `__artifact__:${filename}:ast_pre`, type: 'file', name: `${filename}.ast_pre.md`, locked: true });
    if (data.ast_post) children.push({ id: `__artifact__:${filename}:ast_post`, type: 'file', name: `${filename}.ast_post.md`, locked: true });
  });
  return { id: ARTIFACTS_FOLDER_ID, type: 'folder', name: 'Результаты компиляции', children, locked: true };
}

async function downloadAsZip(tree, contents, projectName) {
  const zip = new JSZip();
  const walk = (nodes, folder) => {
    nodes.forEach((n) => {
      if (n.locked) return;
      if (n.type === 'folder') {
        walk(n.children || [], folder.folder(n.name));
      } else {
        folder.file(n.name, contents[n.id] ?? '');
      }
    });
  };
  walk(tree, zip);
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName || 'atom-project'}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

function TreeRows({ nodes, depth, activeId, onOpen, onStartCreate, onDelete, draft, setDraftName, onConfirmDraft, onCancelDraft }) {
  return nodes.flatMap((node) => {
    const rows = [];
    const isDraftParent = draft && draft.parentId === node.id;
    rows.push(
      <div
        key={node.id}
        className={`tree-node ${activeId === node.id ? 'active' : ''} ${node.locked ? 'tree-node--locked' : ''}`}
        style={{ paddingLeft: `${0.5 + depth * 1}rem` }}
        onClick={() => node.type === 'file' && onOpen(node)}
      >
        <span>{node.type === 'folder' ? (node.locked ? '🔒' : '📁') : '📄'}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.name}</span>
        {!node.locked && (
          <span className="tree-node__actions">
            {node.type === 'folder' && (
              <>
                <button className="ide__icon-btn" title="Новый файл" onClick={(e) => { e.stopPropagation(); onStartCreate(node.id, 'file'); }}>
                  📄+
                </button>
                <button className="ide__icon-btn" title="Новая папка" onClick={(e) => { e.stopPropagation(); onStartCreate(node.id, 'folder'); }}>
                  📁+
                </button>
              </>
            )}
            <button className="ide__icon-btn" title="Удалить" onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}>
              🗑
            </button>
          </span>
        )}
      </div>,
    );
    if (node.children) {
      rows.push(
        ...TreeRows({
          nodes: node.children,
          depth: depth + 1,
          activeId,
          onOpen,
          onStartCreate,
          onDelete,
          draft,
          setDraftName,
          onConfirmDraft,
          onCancelDraft,
        }),
      );
    }
    if (isDraftParent) {
      rows.push(
        <div key="draft" className="tree-node" style={{ paddingLeft: `${0.5 + (depth + 1) * 1}rem` }}>
          <span>{draft.type === 'folder' ? '📁' : '📄'}</span>
          <input
            type="text"
            autoFocus
            className="tree-node__name-input"
            value={draft.name}
            placeholder={draft.type === 'folder' ? 'имя-папки' : 'файл.atm'}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onConfirmDraft();
              if (e.key === 'Escape') onCancelDraft();
            }}
            onBlur={onConfirmDraft}
          />
        </div>,
      );
    }
    return rows;
  });
}

function useResize(initial, { axis, min = 120, max = 600, invert = false }) {
  const [size, setSize] = useState(initial);
  const dragRef = useRef(null);

  const onMouseDown = useCallback((e) => {
    dragRef.current = { start: axis === 'x' ? e.clientX : e.clientY, size };
    const handle = e.currentTarget;
    handle.classList.add('is-dragging');

    const onMove = (ev) => {
      const pos = axis === 'x' ? ev.clientX : ev.clientY;
      const delta = pos - dragRef.current.start;
      const next = dragRef.current.size + (invert ? -delta : delta);
      setSize(Math.min(max, Math.max(min, next)));
    };
    const onUp = () => {
      handle.classList.remove('is-dragging');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [axis, invert, max, min, size]);

  return [size, onMouseDown];
}

export default function EditorPage() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useMediaQuery('(max-width: 900px)');

  // --- анонимный режим (как раньше — всё только в памяти браузера) ---
  const [localTree, setLocalTree] = useState(INITIAL_TREE);
  const [contents, setContents] = useState({
    'main.atm': INITIAL_TREE[0].content,
    'math.atm': INITIAL_TREE[1].content,
    'utils/array_helpers.atm': INITIAL_TREE[2].children[0].content,
  });

  // --- авторизованный режим — реальные проекты на бэкенде ---
  const [projects, setProjects] = useState(null);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [backendTree, setBackendTree] = useState([]);
  const [artifacts, setArtifacts] = useState({});
  const [newProjectDraft, setNewProjectDraft] = useState(null);
  const saveTimers = useRef({});

  const [openTabs, setOpenTabs] = useState(['main.atm']);
  const [activeTab, setActiveTab] = useState('main.atm');
  const [draft, setDraft] = useState(null);
  const [flags, setFlags] = useState({ generateTokens: true, generateAst: true, generateIr: false, mode: 'compile' });
  const [consoleLines, setConsoleLines] = useState([
    { kind: 'muted', text: 'Готов к запуску. Core API ещё не подключён — вывод программы это пока макет.' },
  ]);
  const [isRunning, setIsRunning] = useState(false);

  const [sidebarWidth, sidebarHandle] = useResize(220, { axis: 'x', min: 160, max: 420 });
  const [panelWidth, panelHandle] = useResize(280, { axis: 'x', min: 220, max: 480, invert: true });
  const [consoleHeight, consoleHandle] = useResize(190, { axis: 'y', min: 100, max: 480, invert: true });

  const authed = !!user && !authLoading;

  // --- загрузка списка проектов при логине ---
  useEffect(() => {
    if (!authed) { setProjects(null); return; }
    // не тащим демо-вкладки анонимного режима в авторизованный — пока нет
    // выбранного проекта, редактор должен быть пуст, а не показывать main.atm
    setOpenTabs([]);
    setActiveTab(null);
    setContents({});
    setBackendTree([]);
    apiClient.get('/projects/items/', { params: { mine: 'true' } })
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data.results || [];
        setProjects(list);
        const fromUrl = Number(searchParams.get('project'));
        const initial = list.find((p) => p.id === fromUrl) || list[0];
        if (initial) setActiveProjectId(initial.id);
      })
      .catch(() => setProjects([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  // --- загрузка узлов выбранного проекта ---
  useEffect(() => {
    if (!authed || !activeProjectId) return;
    apiClient.get('/projects/nodes/', { params: { project: activeProjectId } })
      .then(({ data }) => {
        const nodes = Array.isArray(data) ? data : data.results || [];
        setBackendTree(buildTreeFromNodes(nodes));
        const contentMap = {};
        nodes.forEach((n) => { if (n.node_type === 'file') contentMap[n.id] = n.content; });
        setContents(contentMap);
        const firstFile = nodes.find((n) => n.node_type === 'file');
        setOpenTabs(firstFile ? [firstFile.id] : []);
        setActiveTab(firstFile ? firstFile.id : null);
      })
      .catch(() => setBackendTree([]));
    const project = projects?.find((p) => p.id === activeProjectId);
    setArtifacts(project?.artifacts || {});
    setSearchParams(activeProjectId ? { project: activeProjectId } : {}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, activeProjectId]);

  const tree = authed
    ? [...backendTree, ...(Object.keys(artifacts).length ? [buildArtifactsFolder(artifacts)] : [])]
    : localTree;

  const isArtifactTab = typeof activeTab === 'string' && activeTab.startsWith('__artifact__:');

  const openFile = (node) => {
    if (!openTabs.includes(node.id)) setOpenTabs((t) => [...t, node.id]);
    setActiveTab(node.id);
  };

  const closeTab = (id, e) => {
    e.stopPropagation();
    const next = openTabs.filter((t) => t !== id);
    setOpenTabs(next);
    if (activeTab === id) setActiveTab(next[next.length - 1] || null);
  };

  const startCreate = (parentId, type) => setDraft({ parentId, type, name: '' });
  const cancelDraft = () => setDraft(null);

  const confirmDraft = async () => {
    if (!draft || !draft.name.trim()) { setDraft(null); return; }
    const cleanName = draft.name.trim();

    if (authed) {
      try {
        const { data } = await apiClient.post('/projects/nodes/', {
          project: activeProjectId,
          parent: draft.parentId,
          node_type: draft.type,
          name: cleanName,
          content: '',
        });
        setBackendTree((t) => insertInto(t, draft.parentId, draft.type === 'folder'
          ? { id: data.id, type: 'folder', name: cleanName, children: [] }
          : { id: data.id, type: 'file', name: cleanName }));
        if (draft.type === 'file') {
          setContents((c) => ({ ...c, [data.id]: '' }));
          openFile({ id: data.id, type: 'file' });
        }
      } catch {
        setConsoleLines((c) => [...c, { kind: 'err', text: 'Не удалось создать файл — бэкенд недоступен.' }]);
      }
      setDraft(null);
      return;
    }

    const parentPath = draft.parentId ? `${draft.parentId}/` : '';
    const id = `${parentPath}${cleanName}`;
    const newNode = draft.type === 'folder'
      ? { id, type: 'folder', name: cleanName, children: [] }
      : { id, type: 'file', name: cleanName, content: '' };
    setLocalTree((t) => insertInto(t, draft.parentId, newNode));
    if (draft.type === 'file') {
      setContents((c) => ({ ...c, [id]: '' }));
      openFile({ id, type: 'file' });
    }
    setDraft(null);
  };

  const deleteNode = async (id) => {
    if (authed) {
      try {
        await apiClient.delete(`/projects/nodes/${id}/`);
      } catch {
        setConsoleLines((c) => [...c, { kind: 'err', text: 'Не удалось удалить — бэкенд недоступен.' }]);
        return;
      }
      setBackendTree((t) => removeFrom(t, id));
    } else {
      setLocalTree((t) => removeFrom(t, id));
    }
    setOpenTabs((tabs) => tabs.filter((t) => t !== id));
    if (activeTab === id) setActiveTab(null);
  };

  const updateContent = (id, value) => {
    setContents((c) => ({ ...c, [id]: value ?? '' }));
    if (!authed) return;
    clearTimeout(saveTimers.current[id]);
    saveTimers.current[id] = setTimeout(() => {
      apiClient.patch(`/projects/nodes/${id}/`, { content: value ?? '' }).catch(() => {
        setConsoleLines((c) => [...c, { kind: 'err', text: 'Автосохранение не удалось — проверьте соединение.' }]);
      });
    }, 700);
  };

  const createProject = async () => {
    if (!newProjectDraft || !newProjectDraft.trim()) { setNewProjectDraft(null); return; }
    try {
      const { data } = await apiClient.post('/projects/items/', { name: newProjectDraft.trim() });
      setProjects((list) => [data, ...(list || [])]);
      setActiveProjectId(data.id);
    } catch {
      setConsoleLines((c) => [...c, { kind: 'err', text: 'Не удалось создать проект.' }]);
    }
    setNewProjectDraft(null);
  };

  const runCode = async () => {
    setIsRunning(true);
    const usedFlags = Object.entries(flags)
      .filter(([k, v]) => k !== 'mode' && v)
      .map(([k]) => FLAGS.find((f) => f.key === k)?.flag)
      .filter(Boolean);

    const activeName = authed
      ? findNodeName(backendTree, activeTab)
      : (typeof activeTab === 'string' ? activeTab.split('/').pop() : activeTab);

    setConsoleLines((c) => [
      ...c,
      { kind: 'muted', text: `$ atm ${activeName || ''} ${usedFlags.join(' ')} -${flags.mode === 'compile' ? 'C' : 'I'}` },
    ]);

    if (authed && activeProjectId && !isArtifactTab && activeTab && (flags.generateTokens || flags.generateAst)) {
      try {
        const { data } = await apiClient.post(`/projects/items/${activeProjectId}/run_artifacts/`, { node_id: activeTab });
        setArtifacts((a) => ({ ...a, [activeName]: data }));
        setConsoleLines((c) => [
          ...c,
          { kind: 'ok', text: 'Лексер: OK · Парсер: OK · Семантика: OK' },
          { kind: 'muted', text: 'Токены/AST — ниже в дереве, в папке «Результаты компиляции» (пока сгенерированы макетом, не настоящим компилятором).' },
        ]);
      } catch (err) {
        setConsoleLines((c) => [...c, { kind: 'err', text: err.response?.data?.detail || 'Не удалось сгенерировать токены/AST.' }]);
      }
      setIsRunning(false);
      return;
    }

    setTimeout(() => {
      setConsoleLines((c) => [
        ...c,
        { kind: 'ok', text: 'Лексер: OK · Парсер: OK · Семантика: OK' },
        { kind: 'muted', text: 'Бэкенд интерпретатора/LLVM ещё не реализован — вывод программы появится здесь позже.' },
      ]);
      setIsRunning(false);
    }, 900);
  };

  const activeContent = isArtifactTab
    ? getArtifactContent(artifacts, activeTab)
    : (contents[activeTab] ?? '');

  if (isMobile) {
    return (
      <div className="editor-page">
        <div className="editor-desktop-only card">
          <span className="editor-desktop-only__icon">🖥</span>
          <div className="eyebrow">рабочая среда ATM</div>
          <h1>Редактор доступен только на компьютере</h1>
          <p>
            IDE с деревом файлов, Monaco-редактором и консолью нужно много места на экране —
            открой эту страницу на компьютере или планшете в горизонтальной ориентации.
          </p>
        </div>
      </div>
    );
  }

  const activeProject = projects?.find((p) => p.id === activeProjectId);

  return (
    <div className="editor-page">
      <div className="editor-page__head">
        <div>
          <div className="eyebrow">рабочая среда ATM</div>
          <h1 style={{ margin: 0 }}>Редактор-терминал</h1>
        </div>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Тащи серые границы между панелями, чтобы изменить размер
        </span>
      </div>

      {!authed && (
        <div className="editor-anon-warning">
          ⚠️ Вы не авторизованы — код хранится только в этой вкладке браузера и пропадёт при закрытии
          или перезагрузке страницы. Войдите, чтобы проекты сохранялись автоматически.
        </div>
      )}

      <div
        className="ide"
        style={isMobile ? undefined : {
          gridTemplateColumns: `${sidebarWidth}px 5px 1fr 5px ${panelWidth}px`,
          gridTemplateRows: `auto 1fr 5px ${consoleHeight}px`,
        }}
      >
        <aside className="ide__sidebar">
          <div className="ide__sidebar-head">
            {authed ? (
              <Dropdown
                value={activeProjectId}
                onChange={setActiveProjectId}
                options={(projects || []).map((p) => ({ value: p.id, label: p.name }))}
                className="ide__project-dropdown"
              />
            ) : (
              <h4 style={{ margin: 0 }}>Проект</h4>
            )}
            <span style={{ display: 'flex', gap: '0.2rem' }}>
              {authed && (
                <button className="ide__icon-btn" title="Новый проект" onClick={() => setNewProjectDraft('')}>
                  🗀+
                </button>
              )}
              <button
                className="ide__icon-btn"
                title="Новый файл в корне"
                disabled={authed && !activeProjectId}
                onClick={() => startCreate(null, 'file')}
              >📄+</button>
              <button
                className="ide__icon-btn"
                title="Новая папка в корне"
                disabled={authed && !activeProjectId}
                onClick={() => startCreate(null, 'folder')}
              >📁+</button>
            </span>
          </div>

          {newProjectDraft !== null && (
            <div className="tree-node" style={{ paddingLeft: '0.5rem' }}>
              <span>🗀</span>
              <input
                type="text"
                autoFocus
                className="tree-node__name-input"
                value={newProjectDraft}
                placeholder="имя проекта"
                onChange={(e) => setNewProjectDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createProject();
                  if (e.key === 'Escape') setNewProjectDraft(null);
                }}
                onBlur={createProject}
              />
            </div>
          )}

          {authed && projects?.length === 0 && newProjectDraft === null && (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', padding: '0 0.5rem' }}>
              У вас пока нет проектов — создайте первый кнопкой 🗀+ выше.
            </p>
          )}

          <TreeRows
            nodes={tree}
            depth={0}
            activeId={activeTab}
            onOpen={openFile}
            onStartCreate={startCreate}
            onDelete={deleteNode}
            draft={draft}
            setDraftName={(name) => setDraft((d) => ({ ...d, name }))}
            onConfirmDraft={confirmDraft}
            onCancelDraft={cancelDraft}
          />
          {draft && draft.parentId === null && (
            <div className="tree-node" style={{ paddingLeft: '0.5rem' }}>
              <span>{draft.type === 'folder' ? '📁' : '📄'}</span>
              <input
                type="text"
                autoFocus
                className="tree-node__name-input"
                value={draft.name}
                placeholder={draft.type === 'folder' ? 'имя-папки' : 'файл.atm'}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmDraft();
                  if (e.key === 'Escape') cancelDraft();
                }}
                onBlur={confirmDraft}
              />
            </div>
          )}
        </aside>

        {!isMobile && <div className="resize-handle resize-handle--v" style={{ gridColumn: 2 }} onMouseDown={sidebarHandle} />}

        <div className="ide__tabs">
          {openTabs.map((id) => (
            <div
              key={id}
              className={`ide__tab ${activeTab === id ? 'active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              {tabLabel(id, authed, backendTree, localTree)}
              <span onClick={(e) => closeTab(id, e)} style={{ opacity: 0.6 }}>✕</span>
            </div>
          ))}
        </div>

        <div className="ide__editor">
          <div className="ide__editor-bg" />
          {!activeTab ? (
            <div style={{ padding: '1.5rem', color: 'var(--text-secondary)' }}>Откройте или создайте файл слева.</div>
          ) : isArtifactTab && String(activeTab).includes(':ast_') ? (
            <div className="mermaid-scroll">
              <MermaidView markdown={activeContent} />
            </div>
          ) : (
            <Editor
              height="100%"
              defaultLanguage={ATM_LANGUAGE_ID}
              language={ATM_LANGUAGE_ID}
              theme="atom-dark"
              path={String(activeTab)}
              value={activeContent}
              onChange={isArtifactTab ? undefined : (value) => updateContent(activeTab, value)}
              beforeMount={registerAtmLanguage}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                readOnly: isArtifactTab,
                // у Monaco свой нативный скроллбар, обычный CSS на него не
                // действует — скрываем явно (скролл колесом/клавишами работает)
                scrollbar: { vertical: 'hidden', horizontal: 'hidden' },
              }}
            />
          )}
        </div>

        {!isMobile && <div className="resize-handle resize-handle--v" style={{ gridColumn: 4 }} onMouseDown={panelHandle} />}

        <div className="ide__panel">
          <h4 style={{ marginTop: 0, fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
            Что показать
          </h4>
          {FLAGS.map((f) => (
            <label key={f.key} className="flag-row">
              <input
                type="checkbox"
                checked={flags[f.key]}
                onChange={(e) => setFlags({ ...flags, [f.key]: e.target.checked })}
              />
              {f.label}
            </label>
          ))}
          <div className="flag-row" style={{ marginTop: '0.5rem' }}>
            Режим:
            <Dropdown
              value={flags.mode}
              onChange={(v) => setFlags({ ...flags, mode: v })}
              options={[
                { value: 'compile', label: 'Компиляция' },
                { value: 'interpret', label: 'Интерпретация' },
              ]}
              className="ide__mode-dropdown"
            />
          </div>

          <button className="btn btn-primary run-btn" onClick={runCode} disabled={isRunning || !activeTab || isArtifactTab}>
            {isRunning ? <span className="skeleton-spin" /> : '▶'} {isRunning ? 'Выполняется…' : 'Запустить'}
          </button>
          <button
            className="btn btn-secondary run-btn"
            onClick={() => downloadAsZip(tree, contents, activeProject?.name)}
          >
            ⭳ Скачать архив проекта
          </button>
        </div>

        {!isMobile && <div className="resize-handle resize-handle--h" onMouseDown={consoleHandle} />}

        <div className="ide__console">
          {consoleLines.map((line, i) => (
            <div key={i} className={`ide__console-line ide__console-line--${line.kind}`}>
              {line.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function findNodeName(nodes, id) {
  for (const n of nodes) {
    if (n.id === id) return n.name;
    if (n.children) {
      const found = findNodeName(n.children, id);
      if (found) return found;
    }
  }
  return null;
}

function tabLabel(id, authed, backendTree, localTree) {
  if (typeof id === 'string' && id.startsWith('__artifact__:')) {
    const [, filename, kind] = id.split(':');
    const suffix = kind === 'tokens' ? '.tokens.txt' : kind === 'ast_pre' ? '.ast_pre.md' : '.ast_post.md';
    return filename + suffix;
  }
  if (authed) return findNodeName(backendTree, id) || id;
  return typeof id === 'string' ? id.split('/').pop() : id;
}

function getArtifactContent(artifacts, id) {
  const [, filename, kind] = String(id).split(':');
  return artifacts?.[filename]?.[kind] || '';
}
