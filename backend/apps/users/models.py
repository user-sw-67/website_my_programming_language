import secrets

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        MEMBER = 'member', 'Участник сообщества'
        DEVELOPER = 'developer', 'Разработчик языка'
        ADMIN = 'admin', 'Администратор'

    class DeveloperLevel(models.TextChoices):
        # подписи специально на английском — по-русски (Джуниор/Мидл/Сеньор)
        # смотрелось плохо, решение пользователя
        JUNIOR = 'junior', 'Junior'
        MIDDLE = 'middle', 'Middle'
        SENIOR = 'senior', 'Senior'

    role = models.CharField(max_length=16, choices=Role.choices, default=Role.MEMBER)
    # уровень имеет смысл только при role=DEVELOPER (для ADMIN/MEMBER всегда null) —
    # права читаются через can_*-свойства ниже, не напрямую по role/developer_level
    developer_level = models.CharField(
        max_length=16, choices=DeveloperLevel.choices, null=True, blank=True,
    )
    # уникальный ключ для публичного поиска разработчика (см. apps/users/views.py
    # DeveloperViewSet); генерируется автоматически при первом сохранении с
    # role=DEVELOPER/ADMIN, у обычных участников остаётся null
    developer_key = models.CharField(max_length=12, unique=True, null=True, blank=True, db_index=True)
    # отображаемое имя — то, что видят остальные везде на сайте (форум, новости,
    # чат, каталог разработчиков); username остаётся уникальным логином для
    # входа и для поиска по нему (в т.ч. "повысить по логину" у сеньоров), но
    # сам по себе нигде не показывается как основная подпись пользователя.
    # Если display_name не задано — везде на фронте используется username
    # как фоллбэк (см. helpers.js::displayName на фронтенде)
    display_name = models.CharField(max_length=80, blank=True)
    avatar_url = models.URLField(blank=True)
    github_url = models.URLField(blank=True)
    bio = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if self.role in (self.Role.DEVELOPER, self.Role.ADMIN) and not self.developer_key:
            self.developer_key = self._generate_developer_key()
        super().save(*args, **kwargs)

    @staticmethod
    def _generate_developer_key():
        for _ in range(10):
            candidate = f'ATM-{secrets.token_hex(4).upper()}'
            if not User.objects.filter(developer_key=candidate).exists():
                return candidate
        raise RuntimeError('Не удалось сгенерировать уникальный developer_key')

    @property
    def is_developer(self):
        return self.role in (self.Role.DEVELOPER, self.Role.ADMIN)

    @property
    def is_middle_plus(self):
        """Мидл и сеньор-разработчики, либо admin: постить новости, подключаться к чату."""
        return self.role == self.Role.ADMIN or (
            self.role == self.Role.DEVELOPER
            and self.developer_level in (self.DeveloperLevel.MIDDLE, self.DeveloperLevel.SENIOR)
        )

    @property
    def is_senior_plus(self):
        """Сеньор-разработчики и admin: раздают/меняют уровни другим разработчикам."""
        return self.role == self.Role.ADMIN or (
            self.role == self.Role.DEVELOPER and self.developer_level == self.DeveloperLevel.SENIOR
        )

    def __str__(self):
        return self.username
