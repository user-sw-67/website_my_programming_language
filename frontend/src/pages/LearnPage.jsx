import React from 'react';

const STAGES = [
  { title: 'Лексер', text: 'Конечный автомат на C++, превращающий строки модуля в поток токенов.' },
  { title: 'Парсер', text: 'Строит AST: ProgramNode и далее — выражения и операторы.' },
  { title: 'Семантика: DefinitionVisitor', text: '«Разведчик» — регистрирует глобальные функции, классы, переменные, разрешает импорты.' },
  { title: 'Семантика: AnalysisVisitor', text: '«Инспектор» — полный обход, проверка типов, областей видимости, потока управления.' },
  { title: 'Семантика: OptimizationVisitor', text: 'Свёртка констант и переписывание дерева через VisitorCarve.' },
  { title: 'Бэкенд (план)', text: 'Интерпретатор на Value/Environment, в перспективе — компиляция через LLVM.' },
];

export default function LearnPage() {
  return (
    <div>
      <h1>Как создавался ATOM</h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: 640 }}>
        Учебная страница: путь исходного файла <code>.atm</code> от текста до AST, с разбором
        реальных классов проекта.
      </p>
      <div style={{ position: 'relative', paddingLeft: '1.5rem', marginTop: '2rem' }}>
        <div
          style={{
            position: 'absolute',
            left: 5,
            top: 0,
            bottom: 0,
            width: 2,
            background: 'linear-gradient(var(--accent), transparent)',
          }}
        />
        {STAGES.map((s, i) => (
          <div key={s.title} style={{ position: 'relative', marginBottom: '1.75rem' }}>
            <span
              style={{
                position: 'absolute',
                left: -19,
                top: 4,
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: 'var(--accent)',
                boxShadow: 'var(--glow)',
              }}
            />
            <div className="card">
              <h3 style={{ margin: '0 0 0.4rem', color: 'var(--accent)' }}>
                {i + 1}. {s.title}
              </h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{s.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
