from rest_framework import serializers

from apps.users.serializers import PublicUserSerializer

from .models import Feedback


class FeedbackSerializer(serializers.ModelSerializer):
    author = PublicUserSerializer(read_only=True)
    responded_by = PublicUserSerializer(read_only=True)

    class Meta:
        model = Feedback
        fields = (
            'id', 'author', 'kind', 'rating', 'body', 'created_at',
            'developer_response', 'responded_by', 'responded_at',
        )
        read_only_fields = ('id', 'created_at', 'responded_by', 'responded_at')


class FeedbackResponseSerializer(serializers.Serializer):
    developer_response = serializers.CharField(allow_blank=False)
