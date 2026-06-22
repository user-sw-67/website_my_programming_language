from rest_framework import serializers

from apps.users.serializers import PublicUserSerializer

from .models import ChatMessage, ChatSession


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ('id', 'session', 'sender', 'body', 'created_at')
        read_only_fields = ('id', 'created_at')


class ChatSessionSerializer(serializers.ModelSerializer):
    user = PublicUserSerializer(read_only=True)
    developer = PublicUserSerializer(read_only=True)
    messages = ChatMessageSerializer(many=True, read_only=True)
    priority_score = serializers.SerializerMethodField()

    class Meta:
        model = ChatSession
        fields = (
            'id', 'user', 'developer', 'status', 'category', 'waiting_since', 'created_at', 'closed_at',
            'rating', 'review', 'priority_score', 'messages',
        )
        read_only_fields = (
            'id', 'user', 'developer', 'status', 'category', 'waiting_since', 'created_at', 'closed_at',
            'rating', 'review',
        )

    def get_priority_score(self, obj):
        ai_count = getattr(obj, 'ai_message_count', None)
        return obj.priority_score(ai_message_count=ai_count)


class ChatRatingSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    review = serializers.CharField(allow_blank=True, required=False, max_length=1000, default='')
