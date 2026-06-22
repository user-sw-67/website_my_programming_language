from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from .models import ChatMessage, ChatSession
from .serializers import ChatRatingSerializer, ChatSessionSerializer

LEVEL_LABEL = {'junior': 'Junior', 'middle': 'Middle', 'senior': 'Senior'}


def _broadcast_message(session_id, msg):
    async_to_sync(get_channel_layer().group_send)(f'chat_{session_id}', {
        'type': 'chat_message',
        'payload': {
            'id': msg.id, 'sender': msg.sender, 'body': msg.body,
            'created_at': msg.created_at.isoformat(),
        },
    })


def _notify_queue():
    async_to_sync(get_channel_layer().group_send)('chat_queue', {'type': 'queue_update', 'payload': {'event': 'updated'}})


class ChatSessionViewSet(viewsets.ModelViewSet):
    serializer_class = ChatSessionSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        params = self.request.query_params
        # ?mine=true — личная история обращений пользователя (как автора),
        # нужно отдельно от очереди разработчиков: иначе у разработчика
        # is_middle_plus отдавал бы .all() даже когда сам виджет поддержки
        # пытается найти/создать СВОЮ собственную активную сессию
        mine = params.get('mine') == 'true'
        # ?assigned=true — обращения, которые ВЕДЁТ сам разработчик (любой
        # статус) — нужно для вкладки «Мои завершённые» в AdminPage
        assigned = params.get('assigned') == 'true'
        status_param = params.get('status')

        base = ChatSession.objects.annotate(
            ai_message_count=Count('messages', filter=Q(messages__sender=ChatMessage.Sender.AI)),
        ).select_related('user', 'developer')

        if mine or not user.is_middle_plus:
            qs = base.filter(user=user)
        elif assigned:
            qs = base.filter(developer=user)
        elif status_param == ChatSession.Status.CLOSED:
            # завершённые разговоры ДРУГИХ людей — только сеньорам/admin;
            # свои завершённые разработчик смотрит через ?assigned=true
            if not user.is_senior_plus:
                raise PermissionDenied('Просматривать завершённые обращения могут только сеньор-разработчики.')
            qs = base.filter(status=ChatSession.Status.CLOSED)
        else:
            # «Очередь разработчика»: необработанные обращения (нужен любой
            # свободный разработчик) либо те, что уже веду я сам. Обращения,
            # которые пока обслуживает ИИ (status=ai), сюда не попадают —
            # разработчик им не нужен, и видеть их в списке незачем
            qs = base.filter(
                Q(status=ChatSession.Status.WAITING_DEVELOPER)
                | Q(status=ChatSession.Status.WITH_DEVELOPER, developer=user),
            )

        if status_param:
            qs = qs.filter(status=status_param)
        return qs.order_by('-created_at')

    def get_object(self):
        """Детальный просмотр одной сессии (открытие конкретного диалога из
        списка) НЕ должен зависеть от фильтров get_queryset() — те заточены
        под списки (очередь / мои / завершённые) и без явного ?status=closed
        или ?assigned=true исключают закрытые обращения. Из-за этого открытие
        конкретного завершённого разговора по id (и в «Мои завершённые», и в
        сеньорской вкладке «Завершённые») падало 404. Здесь — отдельная,
        более широкая проверка доступа: автор, назначенный разработчик,
        сеньор/admin (видят всё) или любой мидл+ для необработанного тикета
        в очереди (waiting_developer)."""
        obj = get_object_or_404(
            ChatSession.objects.annotate(
                ai_message_count=Count('messages', filter=Q(messages__sender=ChatMessage.Sender.AI)),
            ).select_related('user', 'developer'),
            pk=self.kwargs['pk'],
        )
        user = self.request.user
        is_reporter = obj.user_id == user.id
        is_assigned_dev = obj.developer_id == user.id
        is_visible_in_queue = user.is_middle_plus and obj.status == ChatSession.Status.WAITING_DEVELOPER
        if not (is_reporter or is_assigned_dev or user.is_senior_plus or is_visible_in_queue):
            raise PermissionDenied('Нет доступа к этому обращению.')
        self.check_object_permissions(self.request, obj)
        return obj

    def create(self, request, *args, **kwargs):
        # у пользователя не может быть больше одного активного обращения —
        # если уже есть незакрытое, отдаём его вместо создания дубликата
        existing = ChatSession.objects.filter(user=request.user).exclude(status=ChatSession.Status.CLOSED).first()
        if existing:
            return Response(self.get_serializer(existing).data, status=200)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def claim(self, request, pk=None):
        """Разработчик (мидл+/admin) берёт обращение из очереди в работу.
        Атомарно: если кто-то другой уже взял сессию между запросом списка
        очереди и кликом «Подключиться» — вернём 409, а не перезапишем."""
        if not request.user.is_middle_plus:
            raise PermissionDenied('Подключаться к чату поддержки могут мидл-разработчики и выше.')

        session = get_object_or_404(ChatSession, pk=pk)
        if session.user_id == request.user.id:
            raise PermissionDenied('Нельзя отвечать самому себе на собственное обращение в поддержку.')

        updated = ChatSession.objects.filter(
            pk=pk, status__in=(ChatSession.Status.AI, ChatSession.Status.WAITING_DEVELOPER),
        ).update(developer=request.user, status=ChatSession.Status.WITH_DEVELOPER)
        if not updated:
            return Response({'detail': 'Сессию уже забрал другой разработчик.'}, status=409)

        level_label = LEVEL_LABEL.get(request.user.developer_level, 'Admin')
        text = f'Подключился разработчик {request.user.username} ({level_label}, {request.user.developer_key})'
        msg = ChatMessage.objects.create(session_id=pk, sender=ChatMessage.Sender.SYSTEM, body=text)
        _broadcast_message(pk, msg)
        _notify_queue()

        session.refresh_from_db()
        return Response(ChatSessionSerializer(session).data)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """Завершить разговор — может либо сам автор обращения (в любой
        момент, не дожидаясь разработчика), либо разработчик (назначенный,
        либо любой сеньор/admin на случай, если назначенный недоступен).
        Закрытая сессия больше не висит в очереди и не принимает сообщения
        по WebSocket (см. consumers.py), но остаётся доступна для чтения и
        для оценки (см. rate ниже)."""
        session = get_object_or_404(ChatSession, pk=pk)
        is_reporter = session.user_id == request.user.id
        if not is_reporter and not request.user.is_middle_plus:
            raise PermissionDenied('Закрыть обращение может его автор или разработчик поддержки.')
        if session.status == ChatSession.Status.CLOSED:
            return Response(ChatSessionSerializer(session).data)
        if not is_reporter and session.developer_id and session.developer_id != request.user.id and not request.user.is_senior_plus:
            raise PermissionDenied('Это обращение ведёт другой разработчик.')

        session.status = ChatSession.Status.CLOSED
        session.closed_at = timezone.now()
        session.save(update_fields=['status', 'closed_at'])

        who = 'пользователем' if is_reporter else f'разработчиком {request.user.username}'
        msg = ChatMessage.objects.create(session_id=pk, sender=ChatMessage.Sender.SYSTEM, body=f'Разговор завершён {who}.')
        _broadcast_message(pk, msg)
        _notify_queue()

        return Response(ChatSessionSerializer(session).data)

    @action(detail=True, methods=['post'])
    def rate(self, request, pk=None):
        """Оценка и отзыв о разговоре — оставляет только автор обращения,
        только после того как разговор завершён (любой из сторон)."""
        session = get_object_or_404(ChatSession, pk=pk)
        if session.user_id != request.user.id:
            raise PermissionDenied('Оценить разговор может только его автор.')
        if session.status != ChatSession.Status.CLOSED:
            raise PermissionDenied('Оценить можно только завершённый разговор.')

        serializer = ChatRatingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        session.rating = serializer.validated_data['rating']
        session.review = serializer.validated_data.get('review', '')
        session.save(update_fields=['rating', 'review'])
        return Response(ChatSessionSerializer(session).data)
