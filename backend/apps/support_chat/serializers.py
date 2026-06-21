from rest_framework import serializers

from apps.users.serializers import UserSerializer

from .models import ChatMessage, ChatSession


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ('id', 'session', 'sender', 'body', 'created_at')
        read_only_fields = ('id', 'created_at')


class ChatSessionSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    developer = UserSerializer(read_only=True)
    messages = ChatMessageSerializer(many=True, read_only=True)

    class Meta:
        model = ChatSession
        fields = ('id', 'user', 'developer', 'status', 'created_at', 'messages')
        read_only_fields = ('id', 'user', 'developer', 'status', 'created_at')
