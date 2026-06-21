from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.feedback.models import Feedback
from apps.forum.models import Comment, Topic
from apps.issues.models import Issue
from apps.news.models import NewsPost
from apps.projects.models import Project, ProjectNode
from apps.users.models import User


class Command(BaseCommand):
    help = 'Наполняет базу демонстрационными данными для форума, новостей, отзывов, багов и проектов.'

    def handle(self, *args, **options):
        guest = self._get_or_create_user('guest_dev', role=User.Role.MEMBER)
        author = self._get_or_create_user('mercedessupov', role=User.Role.DEVELOPER)

        self._seed_forum(author, guest)
        self._seed_news(author)
        self._seed_feedback(author, guest)
        self._seed_issues(guest)
        self._seed_projects(guest, author)

        self.stdout.write(self.style.SUCCESS('Демо-данные загружены.'))

    def _get_or_create_user(self, username, role):
        user, created = User.objects.get_or_create(
            username=username,
            defaults={'email': f'{username}@example.com', 'role': role},
        )
        if created:
            user.set_unusable_password()
            user.save()
        return user

    def _seed_forum(self, author, guest):
        topics = [
            {
                'title': 'Как объявить вариативную функцию?',
                'body': 'Пробую написать func sum(...nums) { } — компилятор ругается. Как правильно объявить вариативные аргументы в ATOM?',
                'tags': ['func', 'args'],
                'is_resolved': True,
                'comments': [
                    (author, 'Синтаксис такой: func sum(...nums) { } — у тебя, похоже, опечатка где-то рядом. Покажи полный код функции.'),
                    (guest, 'А, нашёл — забыл точку с запятой после use. Спасибо!'),
                ],
            },
            {
                'title': 'Почему auto не ловит ошибку типа в рантайме?',
                'body': 'Объявил make x = 1; потом x = "строка"; — ничего не упало. Это нормально для gradual typing?',
                'tags': ['typing', 'gradual'],
                'is_resolved': False,
                'comments': [
                    (author, 'Да, для auto проверка типов делегируется рантайму интерпретатора — а он пока не реализован, поэтому проверки нет вообще.'),
                ],
            },
            {
                'title': 'Наследование классов и метод new()',
                'body': 'Можно ли вызвать new() родителя из class Child extends Parent?',
                'tags': ['classes', 'oop'],
                'is_resolved': True,
                'comments': [
                    (guest, 'А как вообще работает порядок вызова конструкторов?'),
                    (author, 'При создании объекта Child интерпретатор вызовет Child.new(), вызов родительского new() — на твоей совести, явного super() пока нет.'),
                    (guest, 'Понял, спасибо за разъяснение!'),
                ],
            },
            {
                'title': 'Импорт модуля @array не резолвится',
                'body': 'use "@array"; даёт ошибку на этапе DefinitionVisitor. Версия актуальная.',
                'tags': ['modules', 'bug'],
                'is_resolved': False,
                'comments': [],
            },
        ]

        for data in topics:
            topic, _ = Topic.objects.get_or_create(
                title=data['title'],
                defaults={
                    'author': author,
                    'body': data['body'],
                    'tags': data['tags'],
                    'is_resolved': data['is_resolved'],
                },
            )
            for comment_author, body in data['comments']:
                Comment.objects.get_or_create(topic=topic, author=comment_author, body=body)

    def _seed_news(self, author):
        second_author = self._get_or_create_user('atom_core_team', role=User.Role.DEVELOPER)
        second_author.developer_level = User.DeveloperLevel.MIDDLE
        second_author.save()

        now = timezone.now()
        posts = [
            {
                'title': 'Семантический анализ: добавлен третий проход OptimizationVisitor',
                'summary': 'Свёртка констант теперь работает для бинарных операций с литералами — меньше узлов в AST, чище итоговый код.',
                'body': (
                    'Третий проход семантического анализа — OptimizationVisitor — теперь умеет сворачивать '
                    'константные бинарные операции прямо на этапе компиляции. Например, выражение '
                    '`2 + 3 * 4` превращается в литерал `14` ещё до генерации промежуточного кода.\n\n'
                    'Используется VisitorCarve — владеющий узлами посетитель, который может заменить '
                    'BinaryOperationNodeAST на LiteralNodeAST прямо in-place. В планах — свёртка для '
                    'строковых конкатенаций и унарных операций.'
                ),
                'tags': ['compiler', 'optimization'],
                'cover_image': 'https://picsum.photos/seed/atom-optimizer/800/450',
                'author': author,
                'days_ago': 1,
            },
            {
                'title': 'Расширение для VS Code',
                'summary': 'Опубликован .vsix с подсветкой синтаксиса ATOM — устанавливается за пару кликов.',
                'body': (
                    'В репозитории появился `atm-vscode-extension` — расширение для VS Code с базовой '
                    'подсветкой синтаксиса ATOM: ключевые слова, типы, строки, комментарии.\n\n'
                    'Установка: Extensions → Install from VSIX → выбрать файл '
                    '`atm-language-0.1.0.vsix`. Поддержка автокомплита и линтинга — в планах, как часть '
                    'работы над веб-редактором.'
                ),
                'tags': ['tooling', 'vscode'],
                'cover_image': 'https://picsum.photos/seed/atom-vscode/800/450',
                'author': author,
                'days_ago': 4,
            },
            {
                'title': 'Старт веб-платформы',
                'summary': 'Начата разработка сайта: редактор кода в браузере, форум сообщества, документация — всё в одном месте.',
                'body': (
                    'Запущена работа над веб-платформой ATOM: React-фронтенд с браузерным редактором кода, '
                    'Django-бэкенд с REST API, форум в духе StackOverflow, документация и витрина '
                    'пользовательских проектов.\n\n'
                    'Архитектура — Docker Compose из шести сервисов (Postgres, Redis, Django, Celery, '
                    'Vite, nginx-gateway). Исходники открыты, будем рассказывать о прогрессе в новостях.'
                ),
                'tags': ['platform', 'announcement'],
                'cover_image': 'https://picsum.photos/seed/atom-platform/800/450',
                'author': author,
                'days_ago': 9,
            },
            {
                'title': 'Gradual typing: явные типы теперь проверяются строго',
                'summary': 'Если переменная объявлена с `-> Type`, AnalysisVisitor больше не пропустит несовпадение типов.',
                'body': (
                    'До этого обновления проверка типов для `make x -> Int = ...` была частичной. Теперь '
                    'AnalysisVisitor валидирует тип литерала против указанного типа на этапе компиляции и '
                    'выдаёт понятную ошибку при несовпадении.\n\n'
                    'Переменные без явного типа (`make x = ...`) остаются `auto` — проверка для них '
                    'по-прежнему делегируется будущему рантайму интерпретатора.'
                ),
                'tags': ['compiler', 'typing'],
                'cover_image': 'https://picsum.photos/seed/atom-typing/800/450',
                'author': second_author,
                'days_ago': 13,
            },
            {
                'title': 'Новый модуль @array в стандартной библиотеке',
                'summary': 'Длина массива, добавление элементов, перебор — без ручных циклов с указателями.',
                'body': (
                    'В `BuildInManager` зарегистрирован модуль `@array` — типовые операции с массивами: '
                    '`array.length()`, `array.push()`, перебор через `for`. Подключается как '
                    '`use "@array";`, без отдельного файла на диске.\n\n'
                    'Документация и примеры — в разделе «Стандартные библиотеки» на странице документации.'
                ),
                'tags': ['stdlib', 'feature'],
                'cover_image': 'https://picsum.photos/seed/atom-array/800/450',
                'author': second_author,
                'days_ago': 18,
            },
            {
                'title': 'Форум сообщества: добавлены теги и отметка «решено»',
                'summary': 'Вопросы на форуме теперь можно фильтровать по тегам, а автор отмечает лучший ответ.',
                'body': (
                    'На странице форума у каждой темы появились теги (например `#typing`, `#classes`) и '
                    'статус «решено» — автор вопроса может отметить, что проблема закрыта.\n\n'
                    'Это упрощает поиск похожих вопросов и помогает новым пользователям быстрее находить '
                    'ответы на частые проблемы с синтаксисом и типизацией.'
                ),
                'tags': ['platform', 'forum'],
                'cover_image': 'https://picsum.photos/seed/atom-forum/800/450',
                'author': author,
                'days_ago': 22,
            },
        ]
        for data in posts:
            NewsPost.objects.get_or_create(
                title=data['title'],
                defaults={
                    'author': data['author'],
                    'summary': data['summary'],
                    'body': data['body'],
                    'tags': data['tags'],
                    'cover_image': data['cover_image'],
                    'is_published': True,
                    'published_at': now - timezone.timedelta(days=data['days_ago']),
                },
            )

    def _seed_feedback(self, author, guest):
        entries = [
            (guest, Feedback.Kind.REVIEW, 5, 'Понравилась идея gradual typing — удобно для прототипов и обучения.'),
            (author, Feedback.Kind.SUGGESTION, 4, 'Хочу свёртку строк на этапе оптимизации, но в целом синтаксис приятный.'),
            (guest, Feedback.Kind.REVIEW, 3, 'Не хватает стандартной библиотеки, жду @string и @file модули.'),
        ]
        for user, kind, rating, body in entries:
            Feedback.objects.get_or_create(author=user, body=body, defaults={'kind': kind, 'rating': rating})

    def _seed_issues(self, guest):
        issues = [
            ('Падение при вложенном use в цикле импорта', Issue.Severity.CRITICAL),
            ('Неочевидное сообщение об ошибке типов в make', Issue.Severity.UNCLEAR),
            ('Опечатка в сообщении про break вне цикла', Issue.Severity.MINOR),
        ]
        for title, severity in issues:
            Issue.objects.get_or_create(
                title=title,
                defaults={'reporter': guest, 'description': title, 'severity': severity},
            )

    def _seed_projects(self, guest, author):
        repos = [
            ('atm-json', guest, 'Минимальный парсер JSON, написанный на ATOM как демонстрация работы со строками и массивами.'),
            ('atm-fizzbuzz', guest, 'Классика для проверки циклов, ветвлений и встроенного модуля @io.'),
            ('atm-calc', author, 'Калькулятор выражений, показывающий работу с классами и операторными перегрузками.'),
        ]
        for name, owner, description in repos:
            project, _ = Project.objects.get_or_create(
                name=name,
                owner=owner,
                defaults={'description': description, 'is_public': True},
            )
            ProjectNode.objects.get_or_create(
                project=project,
                name='main.atm',
                defaults={'node_type': ProjectNode.NodeType.FILE, 'content': 'use "@io";\n'},
            )
