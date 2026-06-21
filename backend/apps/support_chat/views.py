from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from .models import ChatMessage, ChatSession
from .serializers import ChatSessionSerializer

LEVEL_LABEL = {'junior': 'Junior', 'middle': 'Middle', 'senior': 'Senior'}


class ChatSessionViewSet(viewsets.ModelViewSet):
    serializer_class = ChatSessionSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        # мидл+/admin видят все сессии (нужно для очереди задач разработчиков),
        # остальные — только свои
        qs = ChatSession.objects.all() if user.is_middle_plus else ChatSession.objects.filter(user=user)
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def claim(self, request, pk=None):
        """Разработчик (мидл+/admin) берёт обращение из очереди в работу.
        Атомарно: если кто-то другой уже взял сессию между запросом списка
        очереди и кликом «Подключиться» — вернём 409, а не перезапишем.
        Системное сообщение об этом шлём прямо здесь (а не только в
        consumers.py при подключении по WS) — иначе при клейме через REST
        (как в AdminPage::SupportQueueTab) объявление в чате не появится,
        потому что к моменту открытия WS статус уже WITH_DEVELOPER."""
        if not request.user.is_middle_plus:
            raise PermissionDenied('Подключаться к чату поддержки могут мидл-разработчики и выше.')
        updated = ChatSession.objects.filter(
            pk=pk, status__in=(ChatSession.Status.AI, ChatSession.Status.WAITING_DEVELOPER),
        ).update(developer=request.user, status=ChatSession.Status.WITH_DEVELOPER)
        if not updated:
            return Response({'detail': 'Сессию уже забрал другой разработчик.'}, status=409)

        level_label = LEVEL_LABEL.get(request.user.developer_level, 'Admin')
        text = f'Подключился разработчик {request.user.username} ({level_label}, {request.user.developer_key})'
        msg = ChatMessage.objects.create(session_id=pk, sender=ChatMessage.Sender.SYSTEM, body=text)
        async_to_sync(get_channel_layer().group_send)(f'chat_{pk}', {
            'type': 'chat_message',
            'payload': {
                'id': msg.id, 'sender': msg.sender, 'body': msg.body,
                'created_at': msg.created_at.isoformat(),
            },
        })
        async_to_sync(get_channel_layer().group_send)('chat_queue', {'type': 'queue_update', 'payload': {'event': 'updated'}})

        session = self.get_object()
        return Response(ChatSessionSerializer(session).data)
