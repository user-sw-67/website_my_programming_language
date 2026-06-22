import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser
from django.utils import timezone

from . import ai_bot
from .models import ChatMessage, ChatSession

QUEUE_GROUP = 'chat_queue'


class ChatConsumer(AsyncWebsocketConsumer):
    """Один сокет на одну ChatSession. И пользователь, и подключившийся
    разработчик сидят в одной group-комнате `chat_<id>` и видят все сообщения
    в реальном времени — ровно то, что просил пользователь («полноценный
    проф чат, где не будет обновляться и исчезать»)."""

    async def connect(self):
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        self.group_name = f'chat_{self.session_id}'
        user = self.scope['user']

        if isinstance(user, AnonymousUser):
            await self.close()
            return

        session = await self._get_session()
        if session is None:
            await self.close()
            return

        # завершённые разговоры — только чтение через REST (история пользователя,
        # вкладка «Завершённые» у сеньоров); по WebSocket в них больше нельзя
        # заходить никому, даже автору
        if session.status == ChatSession.Status.CLOSED:
            await self.close()
            return

        is_owner = session.user_id == user.id
        is_dev = await self._is_middle_plus(user)
        if not is_owner and not is_dev:
            await self.close()
            return

        # в чат может подключиться только ОДИН разработчик — если сессию уже
        # ведёт другой разработчик, второму вход запрещён (иначе его сообщения
        # ошибочно помечались бы как сообщения пользователя, см. receive())
        if is_dev and not is_owner and session.developer_id and session.developer_id != user.id:
            await self.close()
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # разработчик подключается к ожидающей/ИИ-сессии — берём в работу и
        # объявляем об этом в чате системным сообщением (имя, должность, key-ID)
        if is_dev and not is_owner and session.status != ChatSession.Status.WITH_DEVELOPER:
            session = await self._assign_developer(session, user)
            level_label = await self._level_label(user)
            text = f'Подключился разработчик {user.username} ({level_label}, {user.developer_key})'
            msg = await self._save_message(session, ChatMessage.Sender.SYSTEM, text)
            await self._broadcast(msg)
            await self._notify_queue()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return
        msg_type = data.get('type', 'message')
        user = self.scope['user']
        session = await self._get_session()
        if session is None or session.status == ChatSession.Status.CLOSED:
            return

        if msg_type == 'close_session':
            is_owner = session.user_id == user.id
            is_dev = await self._is_middle_plus(user)
            if not is_owner and not is_dev:
                return
            if is_dev and not is_owner and session.developer_id and session.developer_id != user.id \
                    and not await self._is_senior_plus(user):
                return
            session = await self._close_session(session)
            who = 'пользователем' if is_owner else f'разработчиком {user.username}'
            text = f'Разговор завершён {who}.'
            msg = await self._save_message(session, ChatMessage.Sender.SYSTEM, text)
            await self._broadcast(msg)
            await self._notify_queue()
            return

        if msg_type == 'request_developer':
            category = data.get('category')
            valid_categories = {c for c, _ in ChatSession.Category.choices}
            if category not in valid_categories:
                category = ChatSession.Category.QUESTION
            session = await self._set_waiting(session, category)
            text = 'Передаю обращение разработчику, оставайтесь на линии.'
            msg = await self._save_message(session, ChatMessage.Sender.SYSTEM, text)
            await self._broadcast(msg)
            await self._notify_queue()
            return

        body = (data.get('body') or '').strip()
        if not body:
            return

        is_dev_sender = session.developer_id == user.id
        sender = ChatMessage.Sender.DEVELOPER if is_dev_sender else ChatMessage.Sender.USER
        msg = await self._save_message(session, sender, body)
        await self._broadcast(msg)

        # ИИ отвечает только пока разработчик не подключён
        if sender == ChatMessage.Sender.USER and session.status == ChatSession.Status.AI:
            answer = ai_bot.reply(body)
            ai_msg = await self._save_message(session, ChatMessage.Sender.AI, answer)
            await self._broadcast(ai_msg)

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event['payload']))

    async def _broadcast(self, msg):
        await self.channel_layer.group_send(self.group_name, {
            'type': 'chat_message',
            'payload': {
                'id': msg.id,
                'sender': msg.sender,
                'body': msg.body,
                'created_at': msg.created_at.isoformat(),
            },
        })

    async def _notify_queue(self):
        await self.channel_layer.group_send(QUEUE_GROUP, {'type': 'queue_update', 'payload': {'event': 'updated'}})

    @database_sync_to_async
    def _get_session(self):
        return ChatSession.objects.filter(pk=self.session_id).select_related('user', 'developer').first()

    @database_sync_to_async
    def _is_middle_plus(self, user):
        return user.is_middle_plus

    @database_sync_to_async
    def _is_senior_plus(self, user):
        return user.is_senior_plus

    @database_sync_to_async
    def _level_label(self, user):
        labels = {'junior': 'Junior', 'middle': 'Middle', 'senior': 'Senior'}
        return labels.get(user.developer_level, 'Admin')

    @database_sync_to_async
    def _assign_developer(self, session, user):
        session.developer = user
        session.status = ChatSession.Status.WITH_DEVELOPER
        session.save(update_fields=['developer', 'status'])
        return session

    @database_sync_to_async
    def _close_session(self, session):
        session.status = ChatSession.Status.CLOSED
        session.closed_at = timezone.now()
        session.save(update_fields=['status', 'closed_at'])
        return session

    @database_sync_to_async
    def _set_waiting(self, session, category):
        session.status = ChatSession.Status.WAITING_DEVELOPER
        session.category = category
        session.waiting_since = timezone.now()
        session.save(update_fields=['status', 'category', 'waiting_since'])
        return session

    @database_sync_to_async
    def _save_message(self, session, sender, body):
        return ChatMessage.objects.create(session=session, sender=sender, body=body)


class QueueConsumer(AsyncWebsocketConsumer):
    """Отдельный канал для дашборда разработчиков — пингует, когда очередь
    ожидающих чатов меняется, чтобы UI обновил список (без стриминга самих
    сообщений, см. apps/support_chat/views.py для самого списка)."""

    async def connect(self):
        user = self.scope['user']
        if isinstance(user, AnonymousUser):
            await self.close()
            return
        is_dev = await database_sync_to_async(lambda: user.is_middle_plus)()
        if not is_dev:
            await self.close()
            return
        await self.channel_layer.group_add(QUEUE_GROUP, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(QUEUE_GROUP, self.channel_name)

    async def queue_update(self, event):
        await self.send(text_data=json.dumps(event['payload']))
