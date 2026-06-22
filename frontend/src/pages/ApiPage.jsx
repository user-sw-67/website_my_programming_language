import React, { useMemo, useState } from 'react';
import CodeBlock from '../components/CodeBlock.jsx';
import '../styles/api-docs.css';

// Все эндпоинты + их параметры/тело/ответы сведены вручную из
// backend/apps/*/urls.py + views.py + serializers.py + models.py — цель этой
// страницы (по запросу пользователя) — закрыть для разработчиков всю
// потребность лезть в Swagger (/api/docs/, ссылка оставлена внизу хедера для
// тех, кто всё равно предпочитает интерактивный UI). AUTH-метки — буквальное
// отражение permission_classes, см. ## Роли и уровни разработчиков в CLAUDE.md.
const AUTH = {
  public: { label: 'Публично', tone: 'public' },
  auth: { label: 'Авторизован', tone: 'auth' },
  owner: { label: 'Владелец', tone: 'auth' },
  junior: { label: 'Junior+', tone: 'dev' },
  middle: { label: 'Middle+', tone: 'dev' },
  senior: { label: 'Senior+', tone: 'dev' },
};

// собранные примеры ответов используют один и тот же "публичный" вид
// пользователя (PublicUserSerializer на бэкенде, без email) — вынесено в
// константу, чтобы не повторять руками в каждом примере
const PUBLIC_USER = `{
  "id": 4,
  "username": "test_junior",
  "display_name": "",
  "role": "developer",
  "developer_level": "junior",
  "developer_key": "ATM-82536D3D",
  "is_developer": true,
  "is_middle_plus": false,
  "is_senior_plus": false,
  "avatar_url": "",
  "github_url": "",
  "bio": "",
  "created_at": "2026-01-10T12:00:00Z"
}`;

const CATEGORIES = [
  {
    id: 'auth',
    title: 'Авторизация и пользователи',
    base: '/api/auth/',
    description: 'Регистрация, вход по email, JWT, профиль, аватар, OAuth (Google/GitHub) и публичный каталог разработчиков.',
    endpoints: [
      {
        method: 'POST', path: '/register/', title: 'Регистрация по email', auth: 'public',
        desc: 'Создаёт обычного участника (role=member). После регистрации JWT не выдаётся — нужен отдельный POST /login/.',
        body: [
          { name: 'username', type: 'string', required: true, desc: 'Уникальный логин.' },
          { name: 'email', type: 'string', required: true, desc: 'Уникальный e-mail, используется для входа.' },
          { name: 'password', type: 'string', required: true, desc: 'Хешируется на бэкенде, в ответе не возвращается.' },
        ],
        response: `// 201 Created\n{\n  "username": "newuser",\n  "email": "newuser@example.com"\n}`,
        errors: [{ code: 400, desc: 'username или email уже занят, либо пароль не прошёл валидацию Django (длина, словарность и т.п.).' }],
      },
      {
        method: 'POST', path: '/login/', title: 'Вход', auth: 'public',
        desc: 'Принимает email и пароль, возвращает пару JWT.',
        body: [
          { name: 'email', type: 'string', required: true },
          { name: 'password', type: 'string', required: true },
        ],
        response: `// 200 OK\n{\n  "refresh": "eyJhbGciOi...",\n  "access": "eyJhbGciOi..."\n}`,
        errors: [{ code: 401, desc: 'Неверный email или пароль.' }],
      },
      {
        method: 'POST', path: '/refresh/', title: 'Обновление access-токена', auth: 'public',
        desc: 'Обменивает refresh-токен на новый access — фронтенд дёргает автоматически при 401 от любого запроса.',
        body: [{ name: 'refresh', type: 'string', required: true }],
        response: `// 200 OK\n{ "access": "eyJhbGciOi..." }`,
        errors: [{ code: 401, desc: 'Refresh-токен истёк, отозван или невалиден — нужен повторный /login/.' }],
      },
      {
        method: 'GET', path: '/me/', title: 'Текущий профиль', auth: 'auth',
        desc: 'Единственный эндпоинт, отдающий email — себе самому. Везде, где пользователя видят другие (форум, чат и т.д.), используется укороченное публичное представление без email.',
        headers: [{ name: 'Authorization', desc: 'Bearer <access>' }],
        response: `// 200 OK\n{\n  "id": 4,\n  "username": "test_junior",\n  "email": "junior@atom.test",\n  "display_name": "",\n  "role": "developer",\n  "developer_level": "junior",\n  "developer_key": "ATM-82536D3D",\n  "is_developer": true,\n  "is_middle_plus": false,\n  "is_senior_plus": false,\n  "avatar_url": "",\n  "github_url": "",\n  "bio": "",\n  "created_at": "2026-01-10T12:00:00Z"\n}`,
        errors: [{ code: 401, desc: 'Нет или истёк access-токен.' }],
      },
      {
        method: 'PATCH', path: '/me/', title: 'Изменить профиль', auth: 'auth',
        desc: 'Частичное обновление — пришлите только то, что меняете. role, developer_level, developer_key, email, id — read-only, попытка их передать тихо игнорируется.',
        headers: [{ name: 'Authorization', desc: 'Bearer <access>' }],
        body: [
          { name: 'display_name', type: 'string', desc: 'Необязательное отображаемое имя, заменяет username на фронте.' },
          { name: 'avatar_url', type: 'string', desc: 'Готовый URL картинки (альтернатива POST /me/avatar/).' },
          { name: 'github_url', type: 'string', desc: 'Ссылка на GitHub-профиль.' },
          { name: 'bio', type: 'string', desc: 'Короткое «о себе».' },
        ],
        response: '// 200 OK — обновлённый объект, тот же формат, что GET /me/',
        errors: [{ code: 400, desc: 'Невалидное значение поля (например, слишком длинная строка).' }],
      },
      {
        method: 'POST', path: '/me/avatar/', title: 'Загрузить аватар', auth: 'auth',
        desc: 'Альтернатива вводу готового URL — загружает файл и возвращает ссылку, которую нужно отдельно сохранить через PATCH /me/.',
        contentType: 'multipart/form-data',
        body: [{ name: 'avatar', type: 'file', required: true, desc: 'PNG, JPEG, WebP или GIF, не больше 3 МБ.' }],
        response: `// 201 Created\n{ "url": "https://atom.example/media/avatars/3f9a...png" }`,
        errors: [
          { code: 400, desc: 'Файл не передан, недопустимый тип или больше 3 МБ.' },
          { code: 401, desc: 'Не авторизован.' },
        ],
      },
      {
        method: 'GET', path: '/members/', title: 'Поиск участников', auth: 'senior',
        desc: 'Поиск обычных участников (role=member) — используется перед повышением до разработчика. Единственный поисковый эндпоинт, требующий senior+ (отдаёт чужие данные не публично).',
        params: [{ name: 'search', in: 'query', type: 'string', desc: 'Подстрока в username (без учёта регистра). Без параметра — первые 20 участников.' }],
        response: `// 200 OK\n[\n  { "id": 2, "username": "member1", "display_name": "", "avatar_url": "" }\n]`,
        errors: [{ code: 403, desc: 'Доступно только senior-разработчикам и admin.' }],
      },
      {
        method: 'GET', path: '/developers/', title: 'Каталог разработчиков', auth: 'public',
        desc: 'Публичный список всех разработчиков и админов — страница /developers на фронте.',
        params: [{ name: 'search', in: 'query', type: 'string', desc: 'Ищет по username, display_name (подстрока) или developer_key (точное совпадение).' }],
        response: `// 200 OK\n[\n  {\n    "id": 4, "username": "test_junior", "display_name": "",\n    "developer_level": "junior", "developer_key": "ATM-82536D3D",\n    "avatar_url": "", "github_url": "", "bio": "", "created_at": "2026-01-10T12:00:00Z"\n  }\n]`,
      },
      {
        method: 'GET', path: '/developers/<key>/', title: 'Карточка разработчика', auth: 'public',
        desc: 'Поиск по уникальному ключу вида ATM-XXXXXXXX, а не по числовому id.',
        params: [{ name: 'key', in: 'path', type: 'string', required: true, desc: 'developer_key, например ATM-82536D3D.' }],
        response: '// 200 OK — тот же формат, что элемент списка выше',
        errors: [{ code: 404, desc: 'Ключ не найден или принадлежит не разработчику.' }],
      },
      {
        method: 'POST', path: '/developers/promote/', title: 'Повысить до разработчика', auth: 'senior',
        desc: 'Переводит существующего участника (по username) в role=developer; developer_key генерируется на бэкенде автоматически.',
        body: [
          { name: 'username', type: 'string', required: true, desc: 'Логин уже зарегистрированного участника с role=member.' },
          { name: 'developer_level', type: 'junior | middle | senior', desc: 'По умолчанию junior.' },
        ],
        response: `// 201 Created\n{\n  "id": 9, "username": "newdev", "display_name": "",\n  "developer_level": "junior", "developer_key": "ATM-9F21AB30",\n  "avatar_url": "", "github_url": "", "bio": "", "created_at": "2026-06-20T09:00:00Z"\n}`,
        errors: [
          { code: 400, desc: 'Пользователь не найден или уже разработчик/admin.' },
          { code: 403, desc: 'Доступно только senior-разработчикам и admin.' },
        ],
      },
      {
        method: 'PATCH', path: '/developers/<key>/level/', title: 'Сменить уровень разработчика', auth: 'senior',
        desc: 'junior / middle / senior — себе самому уровень так не меняется, только другому разработчику.',
        params: [{ name: 'key', in: 'path', type: 'string', required: true }],
        body: [{ name: 'developer_level', type: 'junior | middle | senior', required: true }],
        response: '// 200 OK — обновлённая карточка разработчика',
        errors: [
          { code: 403, desc: 'Доступно только senior-разработчикам и admin.' },
          { code: 404, desc: 'Ключ не найден или принадлежит не разработчику.' },
        ],
      },
      {
        method: 'GET', path: '/social/login/google-oauth2/', title: 'OAuth через Google', auth: 'public',
        desc: 'Не JSON-эндпоинт — браузерный редирект на Google, по возврату пайплайн выписывает JWT и кладёт их в query фронтенда (?token=&refresh=), которые подхватывает AuthContext.jsx и удаляет из адресной строки.',
        response: '// 302 → https://atom.example/?token=...&refresh=...',
      },
      {
        method: 'GET', path: '/social/login/github/', title: 'OAuth через GitHub', auth: 'public',
        desc: 'Тот же механизм, что и Google. Запрашивает scope repo + user:email — repo нужен GithubService для пуша проектов из редактора, user:email — чтобы получить почту даже при приватных настройках профиля GitHub.',
        response: '// 302 → https://atom.example/?token=...&refresh=...',
      },
    ],
  },
  {
    id: 'projects',
    title: 'Проекты и редактор',
    base: '/api/projects/',
    description: 'Многопроектный редактор: дерево файлов/папок, автосохранение, предпросмотр токенов/AST и пуш в GitHub.',
    endpoints: [
      {
        method: 'GET', path: '/items/', title: 'Список проектов', auth: 'auth',
        desc: 'Свои проекты + чужие публичные (is_public=true).',
        params: [{ name: 'mine', in: 'query', type: 'boolean', desc: '"true" — только свои проекты, включая приватные.' }],
        response: `// 200 OK\n[\n  {\n    "id": 12, "owner": ${PUBLIC_USER.replace(/\n/g, '\n    ')},\n    "name": "fizzbuzz", "description": "", "is_public": false,\n    "run_flags": {}, "artifacts": {},\n    "created_at": "2026-05-01T10:00:00Z", "updated_at": "2026-06-20T11:00:00Z"\n  }\n]`,
      },
      {
        method: 'POST', path: '/items/', title: 'Создать проект', auth: 'auth',
        desc: 'owner подставляется автоматически из токена.',
        body: [
          { name: 'name', type: 'string', required: true },
          { name: 'description', type: 'string' },
          { name: 'is_public', type: 'boolean', desc: 'По умолчанию false.' },
          { name: 'run_flags', type: 'object', desc: 'Флаги обработки (-t/-a/-i и т.п.), произвольный JSON.' },
        ],
        response: '// 201 Created — тот же формат, что элемент списка выше',
      },
      {
        method: 'GET', path: '/items/<id>/', title: 'Карточка проекта', auth: 'owner',
        desc: 'Включает artifacts — последние сгенерированные токены/AST по файлам (см. run_artifacts ниже).',
        params: [{ name: 'id', in: 'path', type: 'integer', required: true }],
        errors: [{ code: 404, desc: 'Проект не найден или принадлежит другому пользователю.' }],
      },
      {
        method: 'PATCH', path: '/items/<id>/', title: 'Изменить проект', auth: 'owner',
        body: [
          { name: 'name', type: 'string' },
          { name: 'description', type: 'string' },
          { name: 'is_public', type: 'boolean' },
          { name: 'run_flags', type: 'object' },
        ],
        response: '// 200 OK — обновлённый проект',
      },
      {
        method: 'DELETE', path: '/items/<id>/', title: 'Удалить проект', auth: 'owner',
        desc: 'Каскадно удаляет все ProjectNode (файлы и папки) проекта.',
        response: '// 204 No Content',
      },
      {
        method: 'POST', path: '/items/<id>/run_artifacts/', title: 'Сгенерировать токены/AST', auth: 'owner',
        desc: 'Мок-генерация (наивная разбивка + Mermaid-диаграмма по строкам) — формат совпадает с реальным C++-компилятором, но содержимое упрощённое до подключения Core API.',
        body: [{ name: 'node_id', type: 'integer', required: true, desc: 'id файла (ProjectNode с node_type=file) внутри этого проекта.' }],
        response: `// 200 OK\n{\n  "tokens": "# токены (макет)...\\n   1 | KEYWORD | make\\n...",\n  "ast_pre": "# AST до оптимизации\\n\\n\`\`\`mermaid\\nflowchart TD...",\n  "ast_post": "# AST после оптимизации\\n\\n\`\`\`mermaid\\nflowchart TD...",\n  "generated_at": "2026-06-22T10:00:00Z"\n}`,
        errors: [
          { code: 404, desc: 'Файл с таким node_id не найден в проекте.' },
          { code: 413, desc: 'Файл больше 20 КБ или проект больше 200 КБ суммарно.' },
        ],
      },
      {
        method: 'GET', path: '/nodes/', title: 'Дерево файлов/папок', auth: 'owner',
        desc: 'Плоский список — фронтенд сам строит вложенность через поле parent.',
        params: [{ name: 'project', in: 'query', type: 'integer', desc: 'Ограничить узлы одним проектом (рекомендуется — без него отдаются все узлы всех своих проектов).' }],
        response: `// 200 OK\n[\n  { "id": 31, "project": 12, "parent": null, "node_type": "folder", "name": "src", "content": "", "updated_at": "..." },\n  { "id": 32, "project": 12, "parent": 31, "node_type": "file", "name": "main.atm", "content": "use \\"@io\\";", "updated_at": "..." }\n]`,
      },
      {
        method: 'POST', path: '/nodes/', title: 'Создать файл/папку', auth: 'owner',
        desc: 'project и parent в теле запроса обязаны принадлежать текущему пользователю и друг другу — иначе 400 (см. ProjectNodeSerializer.validate).',
        body: [
          { name: 'project', type: 'integer', required: true },
          { name: 'parent', type: 'integer | null', desc: 'id родительской папки, null — корень проекта.' },
          { name: 'node_type', type: 'file | folder', required: true },
          { name: 'name', type: 'string', required: true },
          { name: 'content', type: 'string', desc: 'Только для file — исходный код.' },
        ],
        response: '// 201 Created — тот же формат, что элемент списка выше',
        errors: [{ code: 400, desc: 'project или parent принадлежат другому проекту/пользователю.' }],
      },
      {
        method: 'PATCH', path: '/nodes/<id>/', title: 'Изменить файл/папку', auth: 'owner',
        desc: 'Именно этот запрос дёргает дебounced автосохранение из Monaco (раз в 700мс при правке content).',
        body: [
          { name: 'name', type: 'string' },
          { name: 'content', type: 'string' },
          { name: 'parent', type: 'integer | null', desc: 'Перемещение файла/папки в другую папку того же проекта.' },
        ],
        response: '// 200 OK — обновлённый узел',
      },
      {
        method: 'DELETE', path: '/nodes/<id>/', title: 'Удалить файл/папку', auth: 'owner',
        desc: 'Папка удаляется рекурсивно вместе со всем содержимым (CASCADE по parent).',
        response: '// 204 No Content',
      },
      {
        method: 'POST', path: '/github/push/', title: 'Закоммитить в GitHub', auth: 'auth',
        desc: 'Создаёт (если ещё не существует) репозиторий пользователя и пишет файлы через GitHub Contents API. Требует, чтобы пользователь логинился через GitHub со scope repo (см. /social/login/github/).',
        body: [
          { name: 'repo_name', type: 'string', required: true },
          { name: 'files', type: 'array<{path, content}>', required: true },
          { name: 'message', type: 'string', desc: 'Текст коммита. По умолчанию «Обновление из редактора ATOM».' },
        ],
        response: `// 200 OK\n{ "repo_url": "https://github.com/username/repo_name" }`,
        errors: [{ code: 400, desc: 'repo_name/files не переданы, либо ошибка GitHub API (например, протух токен или нет scope repo).' }],
      },
    ],
  },
  {
    id: 'forum',
    title: 'Сообщество',
    base: '/api/forum/',
    description: 'Вопросы и обсуждения в духе StackOverflow — темы и комментарии к ним.',
    endpoints: [
      {
        method: 'GET', path: '/topics/', title: 'Список тем', auth: 'public',
        desc: 'Сортировка по дате создания, новые сверху. Каждая тема включает вложенный массив comments целиком (без пагинации) — отдельный GET /comments/ почти не нужен.',
        response: `// 200 OK\n[\n  {\n    "id": 7, "author": ${PUBLIC_USER.replace(/\n/g, '\n    ')},\n    "title": "Как работает gradual typing?", "body": "...", "tags": ["typing"],\n    "is_resolved": false, "created_at": "2026-06-01T08:00:00Z", "comments": []\n  }\n]`,
      },
      {
        method: 'POST', path: '/topics/', title: 'Создать тему', auth: 'auth',
        desc: 'author подставляется автоматически из токена.',
        body: [
          { name: 'title', type: 'string', required: true },
          { name: 'body', type: 'string', required: true },
          { name: 'tags', type: 'array<string>', desc: 'Без ограничения на количество (в отличие от новостей).' },
        ],
        response: '// 201 Created — тот же формат, что элемент списка выше',
      },
      {
        method: 'GET', path: '/topics/<id>/', title: 'Открыть тему', auth: 'public',
        response: '// 200 OK — формат темы со всеми комментариями',
        errors: [{ code: 404, desc: 'Тема не найдена.' }],
      },
      {
        method: 'PATCH', path: '/topics/<id>/', title: 'Изменить тему', auth: 'auth',
        desc: 'У TopicViewSet нет проверки автора на уровне объекта — изменить (включая пометить is_resolved) может любой авторизованный пользователь, не только автор темы.',
        body: [
          { name: 'title', type: 'string' },
          { name: 'body', type: 'string' },
          { name: 'tags', type: 'array<string>' },
          { name: 'is_resolved', type: 'boolean' },
        ],
        response: '// 200 OK — обновлённая тема',
      },
      {
        method: 'DELETE', path: '/topics/<id>/', title: 'Удалить тему', auth: 'auth',
        desc: 'Как и PATCH выше — без проверки автора, доступно любому авторизованному пользователю.',
        response: '// 204 No Content',
      },
      {
        method: 'GET', path: '/comments/', title: 'Список комментариев', auth: 'public',
        desc: 'Возвращает ВСЕ комментарии всех тем без фильтра по теме (на бэкенде нет ?topic=) — фронтенд практически всегда читает комментарии через вложенный массив в GET /topics/<id>/ вместо этого эндпоинта.',
        response: `// 200 OK\n[\n  { "id": 15, "topic": 7, "author": ${PUBLIC_USER.replace(/\n/g, '\n  ')}, "body": "...", "is_accepted_answer": false, "created_at": "..." }\n]`,
      },
      {
        method: 'POST', path: '/comments/', title: 'Добавить комментарий', auth: 'auth',
        desc: 'author подставляется автоматически.',
        body: [
          { name: 'topic', type: 'integer', required: true },
          { name: 'body', type: 'string', required: true },
        ],
        response: '// 201 Created — тот же формат, что элемент списка выше',
      },
      {
        method: 'PATCH', path: '/comments/<id>/', title: 'Изменить комментарий', auth: 'auth',
        desc: 'Без проверки автора — как и темы выше, технически доступно любому авторизованному пользователю (например, чтобы пометить is_accepted_answer).',
        body: [{ name: 'body', type: 'string' }, { name: 'is_accepted_answer', type: 'boolean' }],
        response: '// 200 OK — обновлённый комментарий',
      },
      {
        method: 'DELETE', path: '/comments/<id>/', title: 'Удалить комментарий', auth: 'auth',
        response: '// 204 No Content',
      },
    ],
  },
  {
    id: 'issues',
    title: 'Проблемы',
    base: '/api/issues/',
    description: 'Критические и непонятные баги, о которых сообщили пользователи.',
    endpoints: [
      {
        method: 'GET', path: '/', title: 'Список проблем', auth: 'public',
        desc: 'Без параметра — видно всё (публичная страница «Проблемы»).',
        params: [{ name: 'mine', in: 'query', type: 'boolean', desc: '"true" (только для авторизованных) — только свои сообщения.' }],
        response: `// 200 OK\n[\n  {\n    "id": 3, "reporter": 4, "assignee": null, "title": "Падает парсер на пустом файле",\n    "description": "...", "severity": "critical", "status": "open",\n    "created_at": "2026-06-10T12:00:00Z", "updated_at": "2026-06-10T12:00:00Z"\n  }\n]`,
        notes: 'severity: critical | unclear. status: open | in_progress | resolved | closed.',
      },
      {
        method: 'POST', path: '/', title: 'Сообщить о проблеме', auth: 'auth',
        desc: 'reporter подставляется автоматически из токена.',
        body: [
          { name: 'title', type: 'string', required: true },
          { name: 'description', type: 'string', required: true },
          { name: 'severity', type: 'critical | unclear', desc: 'По умолчанию unclear.' },
          { name: 'status', type: 'open | in_progress | resolved | closed', desc: 'По умолчанию open.' },
          { name: 'assignee', type: 'integer | null', desc: 'id пользователя-разработчика.' },
        ],
        response: '// 201 Created — тот же формат, что элемент списка выше',
      },
      {
        method: 'GET', path: '/<id>/', title: 'Открыть проблему', auth: 'public',
        response: '// 200 OK — формат проблемы',
        errors: [{ code: 404, desc: 'Не найдена.' }],
      },
      {
        method: 'PATCH', path: '/<id>/', title: 'Изменить проблему', auth: 'auth',
        desc: 'Без проверки автора на уровне объекта — изменить статус/severity/assignee может любой авторизованный пользователь, не только репортер.',
        body: [
          { name: 'title', type: 'string' }, { name: 'description', type: 'string' },
          { name: 'severity', type: 'critical | unclear' }, { name: 'status', type: 'open | in_progress | resolved | closed' },
          { name: 'assignee', type: 'integer | null' },
        ],
        response: '// 200 OK — обновлённая проблема',
      },
      {
        method: 'DELETE', path: '/<id>/', title: 'Удалить проблему', auth: 'auth',
        response: '// 204 No Content',
      },
    ],
  },
  {
    id: 'feedback',
    title: 'Отзывы и предложения',
    base: '/api/feedback/',
    description: 'Оценки и предложения по языку — с ответом от разработчиков.',
    endpoints: [
      {
        method: 'GET', path: '/', title: 'Список отзывов', auth: 'public',
        response: `// 200 OK\n[\n  {\n    "id": 5, "author": ${PUBLIC_USER.replace(/\n/g, '\n    ')},\n    "kind": "review", "rating": 5, "body": "...", "created_at": "...",\n    "developer_response": "", "responded_by": null, "responded_at": null\n  }\n]`,
        notes: 'kind: review | suggestion. rating — целое 1..5, необязательно (предложения могут быть без оценки).',
      },
      {
        method: 'POST', path: '/', title: 'Оставить отзыв', auth: 'auth',
        desc: 'author подставляется автоматически.',
        body: [
          { name: 'kind', type: 'review | suggestion', desc: 'По умолчанию review.' },
          { name: 'rating', type: 'integer 1-5', desc: 'Необязательно.' },
          { name: 'body', type: 'string', required: true },
        ],
        response: '// 201 Created — тот же формат, что элемент списка выше',
      },
      {
        method: 'PATCH', path: '/<id>/', title: 'Изменить свой отзыв', auth: 'owner',
        desc: 'kind/rating/body — изменить может только автор отзыва.',
        body: [{ name: 'kind', type: 'review | suggestion' }, { name: 'rating', type: 'integer 1-5' }, { name: 'body', type: 'string' }],
        response: '// 200 OK — обновлённый отзыв',
        errors: [{ code: 403, desc: 'Это не ваш отзыв.' }],
      },
      {
        method: 'DELETE', path: '/<id>/', title: 'Удалить свой отзыв', auth: 'owner',
        response: '// 204 No Content',
        errors: [{ code: 403, desc: 'Это не ваш отзыв.' }],
      },
      {
        method: 'POST', path: '/<id>/respond/', title: 'Ответить на отзыв', auth: 'junior',
        desc: 'developer_response, responded_by и responded_at заполняются на бэкенде. Единственное действие платформы, разрешённое самому младшему уровню разработчика.',
        body: [{ name: 'developer_response', type: 'string', required: true }],
        response: '// 200 OK — отзыв с заполненными developer_response/responded_by/responded_at',
        errors: [{ code: 403, desc: 'Доступно только разработчикам (любого уровня) и admin.' }],
      },
    ],
  },
  {
    id: 'news',
    title: 'Новости',
    base: '/api/news/',
    description: 'Новости разработчиков — теги, поиск, обложки и детальные страницы.',
    endpoints: [
      {
        method: 'GET', path: '/', title: 'Список новостей', auth: 'public',
        desc: 'Ответ постраничный (DRF PageNumberPagination) — count/next/previous/results, а не голый массив.',
        params: [
          { name: 'search', in: 'query', type: 'string', desc: 'Ищет по title, summary и имени автора одновременно.' },
          { name: 'tags', in: 'query', type: 'string', desc: 'Через запятую, до 5 — подходит новость хотя бы с одним из тегов (OR). tag= тоже работает, для обратной совместимости.' },
          { name: 'page', in: 'query', type: 'integer' },
          { name: 'page_size', in: 'query', type: 'integer', desc: 'По умолчанию 10, максимум 100 — нужно фронту для подсчёта облака тегов.' },
        ],
        response: `// 200 OK\n{\n  "count": 23, "next": "http://.../api/news/?page=2", "previous": null,\n  "results": [\n    {\n      "id": 9, "slug": "atom-0-3-0", "author": ${PUBLIC_USER.replace(/\n/g, '\n      ')},\n      "title": "Релиз 0.3.0", "summary": "...", "body": "...", "cover_image": "",\n      "blocks": [{ "text": "...", "image": "" }], "tags": ["release"],\n      "is_published": true, "published_at": "2026-06-15T09:00:00Z", "created_at": "..."\n    }\n  ]\n}`,
      },
      {
        method: 'POST', path: '/', title: 'Опубликовать новость', auth: 'middle',
        desc: 'Публикуется сразу (is_published=true, published_at=now). body не передаётся — собирается на бэкенде из текста блоков. Не чаще одного раза в 6 часов на автора.',
        body: [
          { name: 'title', type: 'string', required: true },
          { name: 'summary', type: 'string', desc: 'Короткий тизер для карточки.' },
          { name: 'cover_image', type: 'string', desc: 'Должен совпадать с image одного из blocks.' },
          { name: 'blocks', type: 'array<{text, image?}>', required: true, desc: '1–7 блоков, у каждого обязателен непустой text.' },
          { name: 'tags', type: 'array<string>', desc: 'Не больше 2 тегов.' },
        ],
        response: '// 201 Created — тот же формат, что элемент списка выше',
        errors: [
          { code: 400, desc: 'Больше 2 тегов, не 1–7 блоков, у блока нет текста, либо cover_image не совпадает ни с одним image из blocks.' },
          { code: 429, desc: 'Уже публиковали новость менее 6 часов назад — текст ошибки содержит, сколько ждать.' },
        ],
      },
      {
        method: 'GET', path: '/<slug>/', title: 'Открыть новость', auth: 'public',
        desc: 'Поиск по человекочитаемому slug (генерируется из заголовка автоматически), не по числовому id.',
        response: '// 200 OK — формат новости из списка выше',
        errors: [{ code: 404, desc: 'Слаг не найден.' }],
      },
      {
        method: 'PATCH', path: '/<slug>/', title: 'Изменить новость', auth: 'middle',
        desc: 'Доступно любому мидл+/admin, не только автору — редакторские права командные, а не персональные.',
        body: [{ name: 'title', type: 'string' }, { name: 'summary', type: 'string' }, { name: 'cover_image', type: 'string' }, { name: 'blocks', type: 'array' }, { name: 'tags', type: 'array<string>' }],
        response: '// 200 OK — обновлённая новость',
      },
      {
        method: 'DELETE', path: '/<slug>/', title: 'Удалить новость', auth: 'middle',
        response: '// 204 No Content',
      },
      {
        method: 'POST', path: '/upload-image/', title: 'Загрузить картинку', auth: 'middle',
        desc: 'Для обложки или картинки внутри блока. Своего S3/CDN нет — файл уходит на диск (MEDIA_ROOT).',
        contentType: 'multipart/form-data',
        body: [{ name: 'image', type: 'file', required: true, desc: 'PNG, JPEG, WebP или GIF, не больше 5 МБ.' }],
        response: `// 201 Created\n{ "url": "https://atom.example/media/news/3f9a...jpg" }`,
        errors: [{ code: 403, desc: 'Доступно только мидл+/admin.' }],
      },
    ],
  },
  {
    id: 'support',
    title: 'Чат поддержки',
    base: '/api/support/ + /ws/',
    description: 'Обращения пользователей, ИИ-бот на правилах, очередь разработчиков — REST для истории и действий, WebSocket для самого диалога в реальном времени.',
    endpoints: [
      {
        method: 'GET', path: '/sessions/', title: 'Список обращений', auth: 'auth',
        desc: 'Что именно видно — зависит от роли и параметров, см. params.',
        params: [
          { name: 'mine', in: 'query', type: 'boolean', desc: '"true" — собственные обращения как автора.' },
          { name: 'assigned', in: 'query', type: 'boolean', desc: '"true" (для разработчика) — обращения, которые веду сам, любого статуса.' },
          { name: 'status', in: 'query', type: 'ai | waiting_developer | with_developer | closed', desc: 'status=closed для ЧУЖИХ завершённых обращений доступен только senior+/admin.' },
        ],
        response: `// 200 OK\n[\n  {\n    "id": 21, "user": ${PUBLIC_USER.replace(/\n/g, '\n    ')}, "developer": null,\n    "status": "waiting_developer", "category": "question", "waiting_since": "...",\n    "created_at": "...", "closed_at": null, "rating": null, "review": "",\n    "priority_score": 4, "messages": [ { "id": 100, "session": 21, "sender": "ai", "body": "...", "created_at": "..." } ]\n  }\n]`,
        notes: 'category: question | site_broken | language_bug | critical. priority_score — вес категории + время ожидания + число ответов ИИ, используется для сортировки в очереди разработчика.',
      },
      {
        method: 'POST', path: '/sessions/', title: 'Открыть обращение', auth: 'auth',
        desc: 'У пользователя не может быть больше одного активного обращения — повторный вызов вернёт уже существующее (200), а не создаст дубликат (201).',
        body: [{ name: 'category', type: 'question | site_broken | language_bug | critical', desc: 'По умолчанию question.' }],
        response: '// 200 OK (уже было активное) или 201 Created (новое) — формат как в списке выше',
      },
      {
        method: 'GET', path: '/sessions/<id>/', title: 'Открыть диалог', auth: 'owner',
        desc: 'Доступ: автор обращения, назначенный разработчик, любой senior+/admin, либо любой middle+ — если тикет ещё необработан (waiting_developer).',
        response: '// 200 OK — формат как в списке выше, с полным messages',
        errors: [{ code: 403, desc: 'Нет доступа к этому обращению.' }],
      },
      {
        method: 'POST', path: '/sessions/<id>/claim/', title: 'Взять в работу', auth: 'middle',
        desc: 'Атомарная операция через условный UPDATE — если сессию уже забрал другой разработчик между загрузкой списка и кликом, вернёт 409, а не перезапишет чужой клейм. В чат уходит системное сообщение о подключении (имя, уровень, developer_key).',
        response: '// 200 OK — сессия со status="with_developer" и заполненным developer',
        errors: [
          { code: 403, desc: 'Нужен уровень middle+/admin, либо это собственное обращение пользователя.' },
          { code: 409, desc: 'Сессию уже забрал другой разработчик.' },
        ],
      },
      {
        method: 'POST', path: '/sessions/<id>/close/', title: 'Завершить диалог', auth: 'auth',
        desc: 'Может автор обращения в любой момент, либо ведущий разработчик (или любой senior+/admin, если назначенный недоступен). Повторный вызов на уже закрытой сессии безопасен — просто возвращает её as is.',
        response: '// 200 OK — сессия со status="closed" и заполненным closed_at',
        errors: [{ code: 403, desc: 'Закрыть может только автор или разработчик поддержки (либо это ведёт другой разработчик).' }],
      },
      {
        method: 'POST', path: '/sessions/<id>/rate/', title: 'Оценить диалог', auth: 'owner',
        desc: 'Только автор обращения, только после того как диалог завершён.',
        body: [
          { name: 'rating', type: 'integer 1-5', required: true },
          { name: 'review', type: 'string', desc: 'До 1000 символов, необязательно.' },
        ],
        response: '// 200 OK — сессия с заполненными rating/review',
        errors: [
          { code: 403, desc: 'Оценить может только автор обращения, и только после того как диалог завершён.' },
        ],
      },
      {
        method: 'WS', path: '/ws/chat/<id>/?token=', title: 'Сообщения в реальном времени', auth: 'auth',
        desc: 'Один сокет на сессию (и пользователь, и разработчик — в одной комнате chat_<id>). JWT передаётся в query-строке — браузерный WebSocket API не поддерживает заголовок Authorization.',
        response: `// входящее сообщение от сервера\n{\n  "type": "chat_message",\n  "payload": { "id": 102, "sender": "developer", "body": "...", "created_at": "..." }\n}`,
      },
      {
        method: 'WS', path: '/ws/chat/queue/?token=', title: 'Обновления очереди', auth: 'middle',
        desc: 'Пинг разработчикам, что список ожидающих обращений изменился (без стриминга самих сообщений) — получив событие, фронт перезапрашивает GET /sessions/ заново.',
        response: `{ "type": "queue_update", "payload": { "event": "updated" } }`,
      },
    ],
  },
  {
    id: 'logs',
    title: 'Логи и аналитика',
    base: '/api/logs/',
    description: 'Журнал действий пользователей и агрегированная статистика для админ-панели разработчиков.',
    endpoints: [
      {
        method: 'GET', path: '/', title: 'Журнал действий', auth: 'junior',
        desc: 'Все не-GET запросы к /api/ логируются автоматически мидлварью.',
        response: `// 200 OK\n[\n  { "id": 501, "user": ${PUBLIC_USER.replace(/\n/g, '\n  ')}, "method": "PATCH", "path": "/api/auth/me/", "status_code": 200, "created_at": "..." }\n]`,
      },
      {
        method: 'GET', path: '/<id>/', title: 'Запись журнала', auth: 'junior',
        response: '// 200 OK — формат записи из списка выше',
        errors: [{ code: 404, desc: 'Не найдена.' }],
      },
      {
        method: 'GET', path: '/stats/', title: 'Сводная аналитика', auth: 'junior',
        desc: 'Карточки вкладки «Аналитика» в /admin-panel — видны любому уровню разработчика.',
        response: `// 200 OK\n{\n  "users_total": 142, "users_by_role": { "member": 130, "developer": 11, "admin": 1 },\n  "developers_by_level": { "junior": 5, "middle": 4, "senior": 2 },\n  "feedback_total": 38, "feedback_unanswered": 6,\n  "news_total": 23, "forum_topics_total": 57, "forum_topics_unresolved": 12,\n  "issues_open": 4, "issues_total": 19, "projects_total": 71,\n  "support_sessions_active": 3, "support_sessions_waiting": 1, "support_sessions_closed": 88\n}`,
      },
    ],
  },
  {
    id: 'meta',
    title: 'Схема API',
    base: '/api/schema/ · /api/docs/',
    description: 'Машиночитаемая OpenAPI-схема и Swagger UI — для тех, кто всё равно предпочитает интерактивный инструмент или генерирует клиентский код по схеме.',
    endpoints: [
      {
        method: 'GET', path: '/api/schema/', title: 'OpenAPI-схема', auth: 'public',
        desc: 'JSON/YAML-описание всех эндпоинтов, генерируется автоматически drf-spectacular из реального кода вьюх и сериализаторов — для генерации клиентов (например, под мобильное приложение).',
        response: '// 200 OK — OpenAPI 3 документ',
      },
      {
        method: 'GET', path: '/api/docs/', title: 'Swagger UI', auth: 'public',
        desc: 'Интерактивная документация с возможностью отправлять запросы прямо из браузера — старый способ, оставлен для тех, кто его предпочитает.',
      },
    ],
  },
];

const METHOD_ORDER = { GET: 0, POST: 1, PATCH: 2, DELETE: 3, WS: 4 };
const METHODS = ['GET', 'POST', 'PATCH', 'DELETE', 'WS'];

function EndpointRow({ e, open, onToggle }) {
  const hasDetails = e.params || e.body || e.headers || e.response || e.errors || e.notes || e.contentType;
  return (
    <div className={`api-docs__row ${open ? 'is-open' : ''}`}>
      <button type="button" className="api-docs__row-head-btn" onClick={() => hasDetails && onToggle()}>
        <span className={`api-docs__method api-docs__method--${e.method.toLowerCase()}`}>{e.method}</span>
        <div className="api-docs__row-body">
          <div className="api-docs__row-head">
            <code className="api-docs__path">{e.path}</code>
            <span className={`badge api-docs__auth api-docs__auth--${AUTH[e.auth].tone}`}>{AUTH[e.auth].label}</span>
          </div>
          <div className="api-docs__row-title">{e.title}</div>
          {e.desc && <p className="api-docs__row-desc">{e.desc}</p>}
        </div>
        {hasDetails && <span className={`api-docs__row-caret ${open ? 'is-open' : ''}`}>▾</span>}
      </button>

      {open && hasDetails && (
        <div className="api-docs__row-details">
          {e.contentType && (
            <div className="api-docs__detail-block">
              <div className="api-docs__detail-label">Content-Type</div>
              <code className="api-docs__inline-code">{e.contentType}</code>
            </div>
          )}

          {e.headers && (
            <div className="api-docs__detail-block">
              <div className="api-docs__detail-label">Заголовки</div>
              <table className="api-docs__table">
                <tbody>
                  {e.headers.map((h) => (
                    <tr key={h.name}>
                      <td><code>{h.name}</code></td>
                      <td>{h.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {e.params && (
            <div className="api-docs__detail-block">
              <div className="api-docs__detail-label">Параметры</div>
              <table className="api-docs__table">
                <thead>
                  <tr><th>Имя</th><th>Где</th><th>Тип</th><th>Описание</th></tr>
                </thead>
                <tbody>
                  {e.params.map((p) => (
                    <tr key={p.name}>
                      <td><code>{p.name}</code>{p.required && <span className="api-docs__required">*</span>}</td>
                      <td>{p.in}</td>
                      <td className="api-docs__type">{p.type}</td>
                      <td>{p.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {e.body && (
            <div className="api-docs__detail-block">
              <div className="api-docs__detail-label">Тело запроса</div>
              <table className="api-docs__table">
                <thead>
                  <tr><th>Поле</th><th>Тип</th><th>Описание</th></tr>
                </thead>
                <tbody>
                  {e.body.map((b) => (
                    <tr key={b.name}>
                      <td><code>{b.name}</code>{b.required && <span className="api-docs__required">*</span>}</td>
                      <td className="api-docs__type">{b.type}</td>
                      <td>{b.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="api-docs__required-note">* — обязательное поле</p>
            </div>
          )}

          {e.notes && (
            <div className="api-docs__detail-block">
              <div className="api-docs__detail-label">Примечания</div>
              <p className="api-docs__row-desc" style={{ margin: 0 }}>{e.notes}</p>
            </div>
          )}

          {e.response && (
            <div className="api-docs__detail-block">
              <div className="api-docs__detail-label">Пример ответа</div>
              <CodeBlock code={e.response} />
            </div>
          )}

          {e.errors && (
            <div className="api-docs__detail-block">
              <div className="api-docs__detail-label">Возможные ошибки</div>
              <table className="api-docs__table">
                <tbody>
                  {e.errors.map((err, i) => (
                    <tr key={i}>
                      <td><span className="api-docs__status-code">{err.code}</span></td>
                      <td>{err.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ApiPage() {
  // одна активная категория за раз (как вкладки в DocsPage), а не бесконечный
  // лист всех эндпоинтов подряд — пользователь явно попросил не "листание
  // списком", а переключение между категориями
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [activeMethod, setActiveMethod] = useState(null); // null = все методы
  const [query, setQuery] = useState('');
  // раскрытые карточки — ключ "метод путь", сбрасывается при смене категории
  const [openRows, setOpenRows] = useState(() => new Set());

  const activeCat = CATEGORIES.find((c) => c.id === activeCategory);

  // счётчики по методам считаем уже после фильтра по поиску, но до фильтра по
  // методу — иначе после выбора, скажем, GET все остальные чипы схлопнутся
  // в нули и обратно на них нельзя будет кликнуть, не сбросив фильтр первым
  const { visibleEndpoints, methodCounts } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const bySearch = activeCat.endpoints.filter((e) => {
      if (!q) return true;
      return (
        e.path.toLowerCase().includes(q)
        || e.title.toLowerCase().includes(q)
        || (e.desc || '').toLowerCase().includes(q)
      );
    });
    const counts = {};
    bySearch.forEach((e) => { counts[e.method] = (counts[e.method] || 0) + 1; });
    const final = activeMethod ? bySearch.filter((e) => e.method === activeMethod) : bySearch;
    return {
      visibleEndpoints: [...final].sort((a, b) => METHOD_ORDER[a.method] - METHOD_ORDER[b.method]),
      methodCounts: counts,
    };
  }, [activeCat, activeMethod, query]);

  const selectCategory = (id) => {
    setActiveCategory(id);
    setActiveMethod(null);
    setOpenRows(new Set());
  };

  const toggleRow = (key) => {
    setOpenRows((cur) => {
      const next = new Set(cur);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div className="api-docs">
      <div className="api-docs__hero">
        <div className="eyebrow">REST API платформы</div>
        <h1 style={{ margin: '0 0 0.6rem' }}>API ATOM</h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 720, lineHeight: 1.7 }}>
          Полная документация бэкенда — параметры, тело запроса, пример ответа и возможные
          ошибки прямо здесь, по каждому эндпоинту, сгруппированному по смыслу. Swagger
          больше не обязателен для работы с API, но ссылка на него (для тех, кто всё равно
          предпочитает интерактивный UI или хочет сгенерировать клиент по OpenAPI-схеме)
          оставлена ниже. Базовый путь для всех эндпоинтов — текущий домен сайта.
        </p>
        <div className="api-docs__hero-actions">
          <a className="btn btn-secondary api-docs__ext-btn" href="/api/docs/" target="_blank" rel="noopener noreferrer">
            <svg className="api-docs__ext-btn-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Swagger UI
          </a>
          <a className="btn btn-secondary api-docs__ext-btn" href="/api/schema/" target="_blank" rel="noopener noreferrer">
            <svg className="api-docs__ext-btn-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Скачать OpenAPI-схему
          </a>
        </div>
      </div>

      <div className="api-docs__layout">
        <nav className="card api-docs__nav">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`api-docs__nav-item ${activeCategory === cat.id ? 'is-active' : ''}`}
              onClick={() => selectCategory(cat.id)}
            >
              <span>{cat.title}</span>
              <span className="api-docs__nav-count">{cat.endpoints.length}</span>
            </button>
          ))}
        </nav>

        <div className="api-docs__panel">
          <div className="api-docs__panel-head">
            <div>
              <h2 style={{ margin: '0 0 0.25rem' }}>{activeCat.title}</h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.92rem' }}>{activeCat.description}</p>
            </div>
            <code className="api-docs__base">{activeCat.base}</code>
          </div>

          <div className="api-docs__toolbar">
            <input
              className="api-docs__search"
              type="text"
              placeholder="Поиск по пути, названию или описанию..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="api-docs__chips">
              <button
                type="button"
                className={`api-docs__chip ${activeMethod === null ? 'is-active' : ''}`}
                onClick={() => setActiveMethod(null)}
              >
                Все
              </button>
              {METHODS.filter((m) => methodCounts[m]).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`api-docs__chip api-docs__chip--${m.toLowerCase()} ${activeMethod === m ? 'is-active' : ''}`}
                  onClick={() => setActiveMethod((cur) => (cur === m ? null : m))}
                >
                  {m} <span className="api-docs__nav-count">{methodCounts[m]}</span>
                </button>
              ))}
            </div>
          </div>

          {visibleEndpoints.length === 0 && (
            <p style={{ color: 'var(--text-secondary)' }}>Ничего не найдено по заданным фильтрам.</p>
          )}

          <div className="api-docs__list">
            {visibleEndpoints.map((e) => {
              const key = `${e.method} ${e.path}`;
              return (
                <EndpointRow key={key} e={e} open={openRows.has(key)} onToggle={() => toggleRow(key)} />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
