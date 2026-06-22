from rest_framework import serializers

from apps.users.serializers import PublicUserSerializer

from .models import Comment, Topic


class CommentSerializer(serializers.ModelSerializer):
    author = PublicUserSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ('id', 'topic', 'author', 'body', 'is_accepted_answer', 'created_at')
        read_only_fields = ('id', 'created_at')


class TopicSerializer(serializers.ModelSerializer):
    author = PublicUserSerializer(read_only=True)
    comments = CommentSerializer(many=True, read_only=True)

    class Meta:
        model = Topic
        fields = ('id', 'author', 'title', 'body', 'tags', 'is_resolved', 'created_at', 'comments')
        read_only_fields = ('id', 'created_at')
