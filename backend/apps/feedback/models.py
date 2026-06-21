from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Feedback(models.Model):
    class Kind(models.TextChoices):
        REVIEW = 'review', 'Отзыв'
        SUGGESTION = 'suggestion', 'Предложение'

    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='feedback_entries')
    kind = models.CharField(max_length=16, choices=Kind.choices, default=Kind.REVIEW)
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)], null=True, blank=True)
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    # ответ разработчика — доступен любому уровню (junior и выше), см.
    # apps/feedback/permissions.py
    developer_response = models.TextField(blank=True)
    responded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='feedback_responses',
    )
    responded_at = models.DateTimeField(null=True, blank=True)
