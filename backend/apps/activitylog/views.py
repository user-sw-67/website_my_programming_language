from rest_framework import permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.feedback.models import Feedback
from apps.forum.models import Topic
from apps.issues.models import Issue
from apps.news.models import NewsPost
from apps.projects.models import Project
from apps.users.models import User

from .models import ActivityLog
from .serializers import ActivityLogSerializer


class IsDeveloperOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and request.user.is_developer)


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ActivityLog.objects.all()
    serializer_class = ActivityLogSerializer
    permission_classes = (IsDeveloperOrAdmin,)


class StatsView(APIView):
    """Базовая аналитика для админ-панели разработчиков — доступна любому
    уровню (junior и выше), см. ## Предстоящие задачи в CLAUDE.md."""

    permission_classes = (IsDeveloperOrAdmin,)

    def get(self, request):
        return Response({
            'users_total': User.objects.count(),
            'users_by_role': {
                'member': User.objects.filter(role=User.Role.MEMBER).count(),
                'developer': User.objects.filter(role=User.Role.DEVELOPER).count(),
                'admin': User.objects.filter(role=User.Role.ADMIN).count(),
            },
            'developers_by_level': {
                'junior': User.objects.filter(developer_level=User.DeveloperLevel.JUNIOR).count(),
                'middle': User.objects.filter(developer_level=User.DeveloperLevel.MIDDLE).count(),
                'senior': User.objects.filter(developer_level=User.DeveloperLevel.SENIOR).count(),
            },
            'feedback_total': Feedback.objects.count(),
            'feedback_unanswered': Feedback.objects.filter(developer_response='').count(),
            'news_total': NewsPost.objects.count(),
            'forum_topics_total': Topic.objects.count(),
            'forum_topics_unresolved': Topic.objects.filter(is_resolved=False).count(),
            'issues_open': Issue.objects.filter(status=Issue.Status.OPEN).count(),
            'issues_total': Issue.objects.count(),
            'projects_total': Project.objects.count(),
        })
