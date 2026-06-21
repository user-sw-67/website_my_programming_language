from rest_framework import serializers

from .models import Issue


class IssueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Issue
        fields = (
            'id', 'reporter', 'assignee', 'title', 'description',
            'severity', 'status', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'reporter', 'created_at', 'updated_at')
