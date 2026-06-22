from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    """Полный профиль — используется ТОЛЬКО для `/auth/me/` (сам пользователь
    смотрит/редактирует свои данные). Содержит email — единственное место,
    где он отдаётся; во всех остальных сериализаторах, где пользователь
    показывается другим (автор темы, участник чата и т.д.), используется
    PublicUserSerializer ниже, без email."""

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'display_name', 'role', 'developer_level', 'developer_key',
            'is_developer', 'is_middle_plus', 'is_senior_plus',
            'avatar_url', 'github_url', 'bio', 'created_at',
        )
        read_only_fields = (
            'id', 'email', 'role', 'developer_level', 'developer_key',
            'is_developer', 'is_middle_plus', 'is_senior_plus', 'created_at',
        )


class PublicUserSerializer(serializers.ModelSerializer):
    """Безопасное представление пользователя для показа ДРУГИМ людям — автор
    темы на форуме, участник чата поддержки, автор новости/отзыва, актор в
    журнале действий и т.д. НЕ содержит email — почта видна только самому
    пользователю (см. UserSerializer), даже разработчики и админы её здесь
    не получают. username — уникальный логин (используется при поиске/входе),
    display_name — то, что фактически показывается как имя пользователя на
    фронтенде (с фоллбэком на username, если не задано)."""

    class Meta:
        model = User
        fields = (
            'id', 'username', 'display_name', 'role', 'developer_level', 'developer_key',
            'is_developer', 'is_middle_plus', 'is_senior_plus',
            'avatar_url', 'github_url', 'bio', 'created_at',
        )
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password')

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class DeveloperSerializer(serializers.ModelSerializer):
    """Публичная карточка разработчика — без email, для каталога/поиска по key-ID."""

    class Meta:
        model = User
        fields = ('id', 'username', 'display_name', 'developer_level', 'developer_key', 'avatar_url', 'github_url', 'bio', 'created_at')


class MemberSearchSerializer(serializers.ModelSerializer):
    """Лёгкая карточка участника — для поиска сеньорами перед повышением до
    разработчика (см. MemberSearchView). Поиск и повышение идут по логину
    (username) — email здесь не отдаётся и не используется, это приватные
    данные самого пользователя."""

    class Meta:
        model = User
        fields = ('id', 'username', 'display_name', 'avatar_url')


class DeveloperLevelUpdateSerializer(serializers.Serializer):
    developer_level = serializers.ChoiceField(choices=User.DeveloperLevel.choices)


class PromoteToDeveloperSerializer(serializers.Serializer):
    username = serializers.CharField()
    developer_level = serializers.ChoiceField(choices=User.DeveloperLevel.choices, default=User.DeveloperLevel.JUNIOR)

    def validate_username(self, value):
        try:
            user = User.objects.get(username=value)
        except User.DoesNotExist:
            raise serializers.ValidationError('Пользователь с таким логином не найден.')
        if user.role != User.Role.MEMBER:
            raise serializers.ValidationError('Пользователь уже разработчик или администратор.')
        return value
