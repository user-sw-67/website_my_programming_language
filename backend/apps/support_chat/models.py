from django.conf import settings
from django.db import models


class ChatSession(models.Model):
    class Status(models.TextChoices):
        AI = 'ai', 'Отвечает ИИ'
        WAITING_DEVELOPER = 'waiting_developer', 'Ожидает разработчика'
        WITH_DEVELOPER = 'with_developer', 'Разработчик подключён'
        CLOSED = 'closed', 'Закрыта'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='chat_sessions')
    developer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='handled_chats',
    )
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.AI)
    created_at = models.DateTimeField(auto_now_add=True)


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
