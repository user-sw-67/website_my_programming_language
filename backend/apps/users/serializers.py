from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'role', 'developer_level', 'developer_key',
            'is_developer', 'is_middle_plus', 'is_senior_plus',
            'avatar_url', 'bio', 'created_at',
        )
        read_only_fields = (
            'id', 'role', 'developer_level', 'developer_key',
            'is_developer', 'is_middle_plus', 'is_senior_plus', 'created_at',
        )


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
        fields = ('id', 'username', 'developer_level', 'developer_key', 'avatar_url', 'bio', 'created_at')


class DeveloperLevelUpdateSerializer(serializers.Serializer):
    developer_level = serializers.ChoiceField(choices=User.DeveloperLevel.choices)


class PromoteToDeveloperSerializer(serializers.Serializer):
    username = serializers.CharField()
    developer_level = serializers.ChoiceField(choices=User.DeveloperLevel.choices, default=User.DeveloperLevel.JUNIOR)

    def validate_username(self, value):
        try:
            user = User.objects.get(username=value)
        except User.DoesNotExist:
            raise serializers.ValidationError('Пользователь с таким именем не найден.')
        if user.role != User.Role.MEMBER:
            raise serializers.ValidationError('Пользователь уже разработчик или администратор.')
        return value
