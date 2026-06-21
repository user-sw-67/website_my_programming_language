from django.conf import settings
from django.db import models


class Issue(models.Model):
    class Severity(models.TextChoices):
        CRITICAL = 'critical', 'Критическая'
        UNCLEAR = 'unclear', 'Непонятная'
        MINOR = 'minor', 'Незначительная'

    class Status(models.TextChoices):
        OPEN = 'open', 'Открыта'
        IN_PROGRESS = 'in_progress', 'В работе'
        RESOLVED = 'resolved', 'Решена'

    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reported_issues')
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_issues',
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    severity = models.CharField(max_length=16, choices=Severity.choices, default=Severity.UNCLEAR)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title
