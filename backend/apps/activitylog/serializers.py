from rest_framework import serializers

from apps.users.serializers import UserSerializer

from .models import ActivityLog


class ActivityLogSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = ActivityLog
        fields = ('id', 'user', 'method', 'path', 'status_code', 'created_at')
