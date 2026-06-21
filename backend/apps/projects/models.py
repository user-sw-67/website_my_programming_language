from django.conf import settings
from django.db import models


class Project(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='projects')
    name = models.CharField(max_length=128)
    description = models.TextField(blank=True)
    is_public = models.BooleanField(default=False)
    run_flags = models.JSONField(default=dict, blank=True)
    # последние сгенерированные артефакты запуска — токены/AST по каждому
    # обработанному файлу, см. apps/projects/views.py::ProjectRunArtifactsView.
    # Формат: {"<имя файла>": {"tokens": "...", "ast_pre": "...",
    # "ast_post": "...", "generated_at": "..."}}; пока заполняется макетом
    # (Core API ещё не подключён, см. ## Главный нерешённый архитектурный
    # вопрос в CLAUDE.md) в том же формате, в каком позже будет отдавать
    # настоящий компилятор (tokens_N.txt, ast_pre_N.md, ast_post_N.md)
    artifacts = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class ProjectNode(models.Model):
    class NodeType(models.TextChoices):
        FOLDER = 'folder', 'Папка'
        FILE = 'file', 'Файл'

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='nodes')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    node_type = models.CharField(max_length=8, choices=NodeType.choices)
    name = models.CharField(max_length=255)
    content = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
