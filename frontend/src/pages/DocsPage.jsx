import React, { useState } from 'react';
import CodeBlock from '../components/CodeBlock.jsx';

const SECTIONS = [
  { id: 'syntax', title: 'Синтаксис', text: 'make [const] name [-> Type] = expr; — объявление переменных. func name(a, b = default, ...rest) { } — функции с дефолтами и вариативными параметрами.' },
  { id: 'typing', title: 'Gradual typing', text: 'Без типа — auto, любые операции делегируются рантайму. С явным типом (-> Int) — проверка типов на этапе компиляции.' },
  { id: 'classes', title: 'Классы', text: 'class Name [extends Parent] { new() { } }. Конструктор — метод new(); поддерживается одиночное наследование.' },
  { id: 'modules', title: 'Модули', text: 'use "@io"; use "@math"; use "@array"; — встроенные модули. use "./path.atm"; — импорт другого файла.' },
  { id: 'libraries', title: 'Стандартные библиотеки', kind: 'libraries' },
  { id: 'api', title: 'REST API платформы', text: 'Документация автогенерируется через drf-spectacular и доступна по /api/docs/.' },
];

const LIBRARIES = [
  {
    name: '@io',
    what: 'Ввод и вывод: печать в консоль, чтение строки со стандартного ввода.',
    why: 'Любой минимально полезной программе нужно что-то вывести на экран — без этого модуля даже "Hello, world" не написать.',
    how: 'use "@io"; io.print("Привет, ATOM");',
  },
  {
    name: '@math',
    what: 'Математические функции — sqrt, pow, abs и другие операции, которые не выразить через встроенные операторы.',
    why: 'Чтобы не реализовывать вручную в каждом проекте квадратный корень или возведение в степень.',
    how: 'use "@math"; make r -> Int = math.sqrt(81);',
  },
  {
    name: '@array',
    what: 'Операции с массивами: длина, добавление элементов, перебор.',
    why: 'Массивы — одна из базовых структур данных, модуль закрывает типовые операции над ними без ручных циклов с указателями.',
    how: 'use "@array"; make len -> Int = array.length(items);',
  },
];

export default function DocsPage() {
  const [active, setActive] = useState(SECTIONS[0].id);
  const current = SECTIONS.find((s) => s.id === active);

  return (
    <div className="docs-grid">
      <nav className="card" style={{ alignSelf: 'start' }}>
        {SECTIONS.map((s) => (
          <div
            key={s.id}
            onClick={() => setActive(s.id)}
            style={{
              padding: '0.5rem 0.6rem',
              borderRadius: 8,
              cursor: 'pointer',
              marginBottom: '0.25rem',
              color: active === s.id ? 'var(--accent)' : 'var(--text-secondary)',
              background: active === s.id ? 'var(--accent-soft)' : 'transparent',
            }}
          >
            {s.title}
          </div>
        ))}
      </nav>

      {current.kind === 'libraries' ? (
        <article>
          <h1 style={{ marginTop: 0 }}>{current.title}</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Встроенные модули регистрирует <code>BuildInManager</code> на C++-стороне —
            подключаются через <code>use "@имя";</code>, без отдельного файла на диске.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {LIBRARIES.map((lib) => (
              <div key={lib.name} className="card card--interactive">
                <div className="eyebrow">модуль</div>
                <h3 style={{ margin: '0 0 0.6rem', color: 'var(--accent)' }}>{lib.name}</h3>
                <p style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}><strong>Что:</strong> {lib.what}</p>
                <p style={{ margin: '0 0 0.75rem', color: 'var(--text-secondary)' }}><strong>Зачем:</strong> {lib.why}</p>
                <CodeBlock code={lib.how} />
              </div>
            ))}
          </div>
        </article>
      ) : (
        <article className="card">
          <h1 style={{ marginTop: 0 }}>{current.title}</h1>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{current.text}</p>
          <CodeBlock code={'make x -> Int = 1;\nmake name = "ATOM";\nfunc add(a, b = 0) { return a + b; }'} />
        </article>
      )}
    </div>
  );
}
