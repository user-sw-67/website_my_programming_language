from rest_framework import permissions, viewsets

from .models import Issue
from .serializers import IssueSerializer


class IssueViewSet(viewsets.ModelViewSet):
    serializer_class = IssueSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)

    def get_queryset(self):
        qs = Issue.objects.all().order_by('-created_at')
        if self.request.query_params.get('mine') == 'true' and self.request.user.is_authenticated:
            qs = qs.filter(reporter=self.request.user)
        return qs

    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user)
