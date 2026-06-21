// Подсветка синтаксиса и автодополнение для ATOM в Monaco.
// Источник истины — грамматика VS Code-расширения
// (atm-vscode-extension/syntaxes/atm.tmLanguage.json) и реально
// зарегистрированные встроенные функции (src/addition/builds_manager.cpp в
// корне репозитория) — НЕ документация, она местами забегает вперёд реализации.

export const ATM_LANGUAGE_ID = 'atm';

const KEYWORDS_CONTROL = ['if', 'elif', 'else', 'while', 'for', 'in', 'step', 'do', 'break', 'continue', 'return', 'when', 'match', 'case', 'default'];
const KEYWORDS_DECLARATION = ['make', 'const', 'func', 'class', 'extends', 'new', 'delete', 'this', 'super', 'use', 'from', 'as', 'try', 'catch', 'finally', 'test', 'assert'];
const KEYWORDS_THROW = ['throw'];
const STORAGE_MODIFIERS = ['private', 'public', 'protected', 'static'];
const TYPES = ['Int', 'Double', 'Str', 'Bool', 'Null', 'auto'];
const CONSTANTS = ['true', 'false', 'null'];

export const ATM_KEYWORDS = [
  ...KEYWORDS_CONTROL, ...KEYWORDS_DECLARATION, ...KEYWORDS_THROW, ...STORAGE_MODIFIERS,
];

// автодополнение строится по реально зарегистрированным в BuildInManager
// модулям/функциям/методам — не по документации
export const ATM_BUILTINS = {
  global: [
    { label: 'type', detail: 'type(x) -> Str' },
    { label: 'is_primitive', detail: 'is_primitive(x) -> Bool' },
    { label: 'typeof', detail: 'typeof(x) -> Type' },
    { label: 'primitive_cast', detail: 'primitive_cast(x, Type) -> auto' },
  ],
  io: [
    { label: 'print', detail: 'io.print(...args) -> Null' },
    { label: 'input', detail: 'io.input(prompt = "") -> Str' },
  ],
  math: [
    { label: 'PI', detail: 'math.PI -> Double' },
  ],
  array: [
    { label: 'new', detail: 'Array.new() -> Array' },
    { label: 'push', detail: 'arr.push(x) -> Null' },
    { label: 'pop', detail: 'arr.pop() -> auto' },
    { label: 'at', detail: 'arr.at(i) -> auto' },
    { label: 'insert', detail: 'arr.insert(i, x) -> Null' },
    { label: 'erase', detail: 'arr.erase(i) -> auto' },
    { label: 'size', detail: 'arr.size() -> Int' },
    { label: 'is_empty', detail: 'arr.is_empty() -> Bool' },
    { label: 'clear', detail: 'arr.clear() -> Null' },
    { label: 'sort', detail: 'arr.sort(cmp = null) -> Null' },
  ],
};

export function registerAtmLanguage(monaco) {
  if (monaco.languages.getLanguages().some((l) => l.id === ATM_LANGUAGE_ID)) return;

  monaco.languages.register({ id: ATM_LANGUAGE_ID, extensions: ['.atm'] });

  monaco.languages.setLanguageConfiguration(ATM_LANGUAGE_ID, {
    comments: { lineComment: '#', blockComment: ['/*', '*/'] },
    brackets: [['{', '}'], ['[', ']'], ['(', ')']],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    surroundingPairs: [
      ['{', '}'], ['[', ']'], ['(', ')'], ['"', '"'], ["'", "'"],
    ],
  });

  monaco.languages.setMonarchTokensProvider(ATM_LANGUAGE_ID, {
    defaultToken: '',
    keywords: KEYWORDS_CONTROL.concat(KEYWORDS_DECLARATION, KEYWORDS_THROW),
    storageModifiers: STORAGE_MODIFIERS,
    types: TYPES,
    constants: CONSTANTS,
    operators: [
      '+', '-', '*', '/', '^', '%', '//', '==', '!=', '<', '>', '<=', '>=',
      '&', '|', '!', '=', '+=', '-=', '*=', '/=', '^=', '%=', '//=', '.',
      '?:', '.?', '|>', '..', '->', '...',
    ],
    symbols: /[=><!~?:&|+\-*/^%.]+/,

    tokenizer: {
      root: [
        [/#.*$/, 'comment'],
        [/\/\*/, 'comment', '@comment'],

        [/"([^"\\]|\\.)*"/, 'string'],
        [/\b\d+(\.\d+)?\b/, 'number'],

        [/\b[A-Z][a-zA-Z0-9_]*\b(?=\s*(extends|\{|\())/, 'type.identifier'],

        [/[a-zA-Z_][a-zA-Z0-9_]*(?=\s*\()/, 'entity.function'],

        [/\b[a-zA-Z_][a-zA-Z0-9_]*\b/, {
          cases: {
            '@keywords': 'keyword',
            '@storageModifiers': 'keyword.storage',
            '@types': 'type',
            '@constants': 'constant',
            '@default': 'identifier',
          },
        }],

        [/[{}()\[\]]/, '@brackets'],
        [/[;,]/, 'delimiter'],
        [/@symbols/, 'operator'],
        [/\s+/, 'white'],
      ],

      comment: [
        [/[^/*]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/[/*]/, 'comment'],
      ],
    },
  });

  monaco.languages.registerCompletionItemProvider(ATM_LANGUAGE_ID, {
    triggerCharacters: ['.'],
    provideCompletionItems(model, position) {
      const line = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
      const moduleMatch = line.match(/([a-zA-Z_][a-zA-Z0-9_]*)\.\s*$/);

      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      if (moduleMatch && ATM_BUILTINS[moduleMatch[1]]) {
        return {
          suggestions: ATM_BUILTINS[moduleMatch[1]].map((item) => ({
            label: item.label,
            kind: monaco.languages.CompletionItemKind.Method,
            detail: item.detail,
            insertText: item.label,
            range,
          })),
        };
      }

      const suggestions = [
        ...ATM_KEYWORDS.map((kw) => ({
          label: kw,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: kw,
          range,
        })),
        ...TYPES.map((t) => ({
          label: t,
          kind: monaco.languages.CompletionItemKind.TypeParameter,
          insertText: t,
          range,
        })),
        ...ATM_BUILTINS.global.map((item) => ({
          label: item.label,
          kind: monaco.languages.CompletionItemKind.Function,
          detail: item.detail,
          insertText: item.label,
          range,
        })),
        {
          label: 'func',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'func ${1:name}(${2:args}) {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'Объявление функции',
          range,
        },
        {
          label: 'class',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'class ${1:Name} {\n\tnew() {\n\t\t$0\n\t}\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'Объявление класса',
          range,
        },
        {
          label: 'use module',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'use "@${1:io}";',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'Импорт встроенного модуля',
          range,
        },
      ];

      return { suggestions };
    },
  });

  monaco.editor.defineTheme('atom-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '5a7868', fontStyle: 'italic' },
      { token: 'string', foreground: '7dd3a8' },
      { token: 'number', foreground: 'f0b35b' },
      { token: 'keyword', foreground: '34d399', fontStyle: 'bold' },
      { token: 'keyword.storage', foreground: 'c792ea' },
      { token: 'type', foreground: '38bdf8' },
      { token: 'type.identifier', foreground: '38bdf8' },
      { token: 'constant', foreground: 'f87171' },
      { token: 'entity.function', foreground: 'e3f3ec', fontStyle: 'bold' },
      { token: 'identifier', foreground: 'e3f3ec' },
      { token: 'operator', foreground: '87a597' },
      { token: 'delimiter', foreground: '87a597' },
    ],
    colors: {
      'editor.background': '#16211c00',
      'editorGutter.background': '#16211c00',
      'minimap.background': '#16211c00',
      'editor.lineHighlightBackground': '#34d39912',
    },
  });
}
