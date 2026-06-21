from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Feedback
from .permissions import IsDeveloperToRespond
from .serializers import FeedbackResponseSerializer, FeedbackSerializer


class FeedbackViewSet(viewsets.ModelViewSet):
    queryset = Feedback.objects.all().order_by('-created_at')
    serializer_class = FeedbackSerializer
    permission_classes = (IsDeveloperToRespond,)

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['post'])
    def respond(self, request, pk=None):
        """Ответ разработчика (junior и выше) на отзыв/предложение."""
        feedback = self.get_object()
        serializer = FeedbackResponseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        feedback.developer_response = serializer.validated_data['developer_response']
        feedback.responded_by = request.user
        feedback.responded_at = timezone.now()
        feedback.save()
        return Response(FeedbackSerializer(feedback).data)
