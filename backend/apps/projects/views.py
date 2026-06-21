import re
from datetime import datetime

from django.db.models import Q
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .github_service import GithubService, GithubServiceError
from .models import Project, ProjectNode
from .serializers import ProjectNodeSerializer, ProjectSerializer

# лимиты на предпросмотр артефактов (токены/AST) — пока эти данные генерируются
# макетом на лету при каждом запросе (Core API не подключён, см. ## Главный
# нерешённый архитектурный вопрос в CLAUDE.md), но лимит закладываем уже сейчас,
# на будущее, когда здесь будет настоящий компилятор: разбор/печать AST для
# огромного файла — не бесплатная операция, нет смысла пускать на это
# неограниченный размер с фронтенда
MAX_FILE_BYTES_FOR_ARTIFACTS = 20_000  # ~20 КБ на один файл
MAX_PROJECT_BYTES_FOR_ARTIFACTS = 200_000  # ~200 КБ суммарно по всем файлам проекта

TOKEN_PATTERN = re.compile(
    r'"(?:[^"\\]|\\.)*"'           # строки
    r'|\b\d+(?:\.\d+)?\b'           # числа
    r'|[A-Za-z_][A-Za-z0-9_]*'      # идентификаторы/ключевые слова
    r'|->|\.\.\.|==|!=|<=|>=|[{}()\[\];,.+\-*/%=<>!]',
)
KEYWORDS = {
    'make', 'const', 'func', 'class', 'extends', 'new', 'delete', 'this', 'super',
    'use', 'from', 'as', 'try', 'catch', 'finally', 'test', 'assert', 'if', 'elif',
    'else', 'while', 'for', 'in', 'step', 'do', 'break', 'continue', 'return',
    'when', 'match', 'case', 'default', 'throw', 'private', 'public', 'protected',
    'static',
}
TYPES = {'Int', 'Double', 'Str', 'Bool', 'Null'}


def _classify(token):
    if token.startswith('"'):
        return 'STRING'
    if token[0].isdigit():
        return 'NUMBER'
    if token in KEYWORDS:
        return 'KEYWORD'
    if token in TYPES:
        return 'TYPE'
    if re.match(r'^[A-Za-z_]', token):
        return 'IDENT'
    return 'PUNCT'


def _generate_mock_tokens(source):
    """Наивная (не настоящая лексическая) разбивка — только для предпросмотра
    формата вывода до того, как появится настоящий бэкенд-компилятор."""
    lines = ['# токены (макет — настоящий лексер ещё не подключён к сайту)', '']
    for i, match in enumerate(TOKEN_PATTERN.finditer(source), start=1):
        token = match.group(0)
        lines.append(f'{i:>4} | {_classify(token):<8} | {token}')
    return '\n'.join(lines) + '\n'


def _generate_mock_ast(source, filename, stage):
    """Мок AST в виде Mermaid-диаграммы — формат совпадает с тем, что реально
    выдаёт C++ компилятор (см. MermaidVisitor в корневом проекте), но содержимое
    здесь упрощённое: по одному узлу на непустую строку исходника."""
    title = 'AST до оптимизации' if stage == 'pre' else 'AST после оптимизации'
    lines = source.splitlines() or ['']
    mermaid = ['```mermaid', 'flowchart TD', f'  root["Program: {filename}"]']
    for i, line in enumerate(lines):
        text = line.strip()
        if not text:
            continue
        label = text.replace('"', "'")[:40]
        mermaid.append(f'  n{i}["{label}"]')
        mermaid.append(f'  root --> n{i}')
    mermaid.append('```')
    return f'# {title}\n\n_Макет — настоящий OptimizationVisitor пока не подключён к сайту._\n\n' + '\n'.join(mermaid) + '\n'


class IsOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        project = obj if isinstance(obj, Project) else obj.project
        return project.owner_id == request.user.id


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly, IsOwner)

    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'create'):
            return (permissions.IsAuthenticatedOrReadOnly(),)
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        qs = Project.objects.filter(owner=user) if user.is_authenticated else Project.objects.none()
        if self.request.query_params.get('mine') != 'true':
            qs = qs | Project.objects.filter(is_public=True)
        return qs.distinct().order_by('-updated_at')

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'])
    def run_artifacts(self, request, pk=None):
        """Генерирует (пока — макетом) токены и AST для одного файла проекта
        и сохраняет их в Project.artifacts. node_id — id ProjectNode типа file."""
        project = self.get_object()
        try:
            node = project.nodes.get(pk=request.data.get('node_id'), node_type=ProjectNode.NodeType.FILE)
        except ProjectNode.DoesNotExist:
            return Response({'detail': 'Файл не найден в проекте.'}, status=404)

        if len(node.content.encode('utf-8')) > MAX_FILE_BYTES_FOR_ARTIFACTS:
            return Response(
                {'detail': f'Файл больше {MAX_FILE_BYTES_FOR_ARTIFACTS // 1000} КБ — предпросмотр токенов/AST недоступен.'},
                status=413,
            )
        total_size = sum(len(c.encode('utf-8')) for c in project.nodes.filter(node_type=ProjectNode.NodeType.FILE).values_list('content', flat=True))
        if total_size > MAX_PROJECT_BYTES_FOR_ARTIFACTS:
            return Response(
                {'detail': f'Проект больше {MAX_PROJECT_BYTES_FOR_ARTIFACTS // 1000} КБ суммарно — предпросмотр токенов/AST недоступен.'},
                status=413,
            )

        artifacts = dict(project.artifacts)
        artifacts[node.name] = {
            'tokens': _generate_mock_tokens(node.content),
            'ast_pre': _generate_mock_ast(node.content, node.name, 'pre'),
            'ast_post': _generate_mock_ast(node.content, node.name, 'post'),
            'generated_at': datetime.utcnow().isoformat() + 'Z',
        }
        project.artifacts = artifacts
        project.save(update_fields=['artifacts'])
        return Response(artifacts[node.name])


class ProjectNodeViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectNodeSerializer
    permission_classes = (permissions.IsAuthenticated, IsOwner)

    def get_queryset(self):
        qs = ProjectNode.objects.filter(project__owner=self.request.user)
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs


class GithubPushView(APIView):
    """Заготовка: создаёт (если нужно) репозиторий пользователя на GitHub и
    записывает в него переданные файлы через Contents API. Требует, чтобы
    пользователь логинился через GitHub с scope 'repo' (см. SOCIAL_AUTH_GITHUB_SCOPE)."""

    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        repo_name = request.data.get('repo_name')
        files = request.data.get('files')
        message = request.data.get('message') or 'Обновление из редактора ATOM'

        if not repo_name or not files:
            return Response({'detail': 'Поля repo_name и files обязательны.'}, status=400)

        try:
            service = GithubService(request.user)
            repo = service.get_or_create_repo(repo_name)
            service.push_files(repo['full_name'], files, message)
        except GithubServiceError as exc:
            return Response({'detail': str(exc)}, status=400)

        return Response({'repo_url': repo['html_url']})
