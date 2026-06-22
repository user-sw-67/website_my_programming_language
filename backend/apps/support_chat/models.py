from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone


class ChatSession(models.Model):
    class Status(models.TextChoices):
        AI = 'ai', 'Отвечает ИИ'
        WAITING_DEVELOPER = 'waiting_developer', 'Ожидает разработчика'
        WITH_DEVELOPER = 'with_developer', 'Разработчик подключён'
        CLOSED = 'closed', 'Закрыта'

    class Category(models.TextChoices):
        QUESTION = 'question', 'Вопрос по языку или документации'
        SITE_BROKEN = 'site_broken', 'Не работает сайт или личный кабинет'
        LANGUAGE_BUG = 'language_bug', 'Баг в языке или компиляторе'
        CRITICAL = 'critical', 'Критично: потерян доступ или данные'

    # базовый вес категории — основа приоритета в очереди (см. priority_score
    # ниже); пользователь выбирает категорию в момент запроса разработчика
    # (request_developer в consumers.py), согласовано с пользователем проекта
    CATEGORY_WEIGHT = {
        Category.QUESTION: 1,
        Category.SITE_BROKEN: 2,
        Category.LANGUAGE_BUG: 2,
        Category.CRITICAL: 3,
    }

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='chat_sessions')
    developer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='handled_chats',
    )
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.AI)
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.QUESTION)
    # момент перехода в WAITING_DEVELOPER — отдельно от created_at, потому что
    # пользователь мог сначала долго переписываться с ИИ-ботом; ждать
    # разработчика он начинает именно с этого момента (см. priority_score)
    waiting_since = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    # оценка и отзыв — оставляет автор обращения после завершения разговора
    # (любой из сторон), см. ChatSessionViewSet.rate
    rating = models.PositiveSmallIntegerField(
        null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    review = models.TextField(blank=True)

    def priority_score(self, ai_message_count=None):
        """Приоритет обращения в очереди поддержки — сумма трёх факторов,
        согласованных с пользователем проекта: вес категории, бонус за время
        ожидания разработчика и бонус за сложность диалога с ИИ-ботом (чем
        больше сообщений бот написал до запроса разработчика — тем менее
        тривиален случай). Считается на лету, не хранится в БД."""
        weight = self.CATEGORY_WEIGHT.get(self.category, 1)

        wait_bonus = 0
        if self.waiting_since and self.status != self.Status.CLOSED:
            minutes = (timezone.now() - self.waiting_since).total_seconds() / 60
            if minutes >= 15:
                wait_bonus = 2
            elif minutes >= 5:
                wait_bonus = 1

        if ai_message_count is None:
            ai_message_count = self.messages.filter(sender='ai').count()
        if ai_message_count >= 5:
            ai_bonus = 2
        elif ai_message_count >= 2:
            ai_bonus = 1
        else:
            ai_bonus = 0

        return weight + wait_bonus + ai_bonus


class ChatMessage(models.Model):
    class Sender(models.TextChoices):
        USER = 'user', 'Пользователь'
        AI = 'ai', 'ИИ-помощник'
        DEVELOPER = 'developer', 'Разработчик'
        SYSTEM = 'system', 'Системное сообщение'

    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    sender = models.CharField(max_length=16, choices=Sender.choices)
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
