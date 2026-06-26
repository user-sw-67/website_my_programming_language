import uuid

import bleach
from django.core.files.storage import default_storage
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, Throttled, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    ALLOWED_ATTACHMENT_EXTENSIONS,
    MAX_ATTACHMENT_BYTES,
    MAX_ATTACHMENTS_PER_TOPIC,
    Comment,
    ForumAttachment,
    ForumCategory,
    ForumRating,
    Topic,
)
from .permissions import IsAdminOrReadOnly, IsAuthorOrReadOnly
from .serializers import (
    CommentSerializer,
    ForumAttachmentSerializer,
    ForumCategorySerializer,
    TopicDetailSerializer,
    TopicListSerializer,
    build_comment_tree,
)

# теги/атрибуты, которые допускает rich-text из Tiptap — остальное (включая
# <script>) вырезается; без этого HTML из блоков поста — открытая XSS-дыра.
# data-ref-*/class у <a> — это ссылки «на строки файла» из CommentEditor.jsx
# (см. CodeRefMark), обычные <a> у блоков поста ими не пользуются, но один
# общий whitelist проще, чем два почти одинаковых
ALLOWED_HTML_TAGS = [
    'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'ul', 'ol', 'li',
    'a', 'code', 'pre', 'blockquote', 'h1', 'h2', 'h3',
]
ALLOWED_HTML_ATTRS = {'a': ['href', 'target', 'rel', 'class', 'data-ref-attachment', 'data-ref-start', 'data-ref-end']}

# не чаще одного поста в 6 часов на автора — тот же паттерн, что NEWS_COOLDOWN
FORUM_COOLDOWN = timezone.timedelta(hours=6)

# фото к блокам поста — тот же whitelist/лимит, что у news.views.ImageUploadView,
# но без ограничения по роли: фото к посту может приложить любой автор, а не
# только мидл+ (это право относится к новостям, не к постам Реактора)
ALLOWED_IMAGE_TYPES = {'image/png', 'image/jpeg', 'image/webp', 'image/gif'}
MAX_IMAGE_BYTES = 5 * 1024 * 1024


def sanitize_blocks(blocks):
    cleaned = []
    for block in blocks:
        text = bleach.clean(block.get('text', ''), tags=ALLOWED_HTML_TAGS, attributes=ALLOWED_HTML_ATTRS, strip=True)
        cleaned.append({'text': text, 'image': block.get('image', '')})
    return cleaned


def blocks_to_plain_text(blocks):
    return '\n\n'.join(bleach.clean(b.get('text', ''), tags=[], strip=True).strip() for b in blocks).strip()


class ForumPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class ForumCategoryViewSet(viewsets.ModelViewSet):
    queryset = ForumCategory.objects.all()
    serializer_class = ForumCategorySerializer
    permission_classes = (IsAdminOrReadOnly,)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class TopicViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly)
    pagination_class = ForumPagination
    lookup_field = 'slug'

    def get_serializer_class(self):
        if self.action == 'list':
            return TopicListSerializer
        return TopicDetailSerializer

    def get_queryset(self):
        qs = Topic.objects.select_related('author', 'category').annotate(comments_count=Count('comments'))
        params = self.request.query_params
        user = self.request.user

        if params.get('mine') == 'true' and user.is_authenticated:
            qs = qs.filter(author=user)
        elif self.action == 'retrieve' and user.is_authenticated:
            # автор должен видеть свой скрытый пост по прямой ссылке (профиль
            # → «Мои посты»), а не только через ?mine=true
            qs = qs.filter(Q(is_hidden=False) | Q(author=user))
        else:
            qs = qs.filter(is_hidden=False)

        search = params.get('search')
        if search:
            qs = qs.filter(
                Q(title__icontains=search) | Q(summary__icontains=search) | Q(body__icontains=search)
                | Q(author__username__icontains=search) | Q(author__display_name__icontains=search),
            )

        tags_param = params.get('tags') or params.get('tag')
        if tags_param:
            selected = [t.strip() for t in tags_param.split(',') if t.strip()][:5]
            tag_q = Q()
            for t in selected:
                tag_q |= Q(tags__contains=[t])
            qs = qs.filter(tag_q)

        category = params.get('category')
        if category:
            qs = qs.filter(category__slug=category)

        resolved = params.get('resolved')
        if resolved == 'true':
            qs = qs.filter(is_resolved=True)
        elif resolved == 'false':
            qs = qs.filter(is_resolved=False)

        sort = params.get('sort')
        if sort == 'top_rated':
            qs = qs.order_by('-avg_rating', '-ratings_count')
        elif sort == 'most_discussed':
            qs = qs.order_by('-comments_count')
        elif sort == 'oldest':
            qs = qs.order_by('created_at')
        else:
            qs = qs.order_by('-created_at')
        return qs

    def perform_create(self, serializer):
        last = Topic.objects.filter(author=self.request.user).order_by('-created_at').first()
        if last and timezone.now() - last.created_at < FORUM_COOLDOWN:
            wait_left = FORUM_COOLDOWN - (timezone.now() - last.created_at)
            raise Throttled(detail=f'Можно публиковать не чаще раза в 6 часов. Подождите ещё {wait_left.seconds // 60} мин.')
        blocks = sanitize_blocks(serializer.validated_data.get('blocks', []))
        serializer.save(author=self.request.user, blocks=blocks, body=blocks_to_plain_text(blocks))

    def perform_update(self, serializer):
        if 'blocks' in serializer.validated_data:
            blocks = sanitize_blocks(serializer.validated_data['blocks'])
            serializer.save(blocks=blocks, body=blocks_to_plain_text(blocks))
        else:
            serializer.save()

    @action(detail=True, methods=['get'], permission_classes=(permissions.AllowAny,))
    def comments(self, request, slug=None):
        topic = self.get_object()
        flat = list(
            Comment.objects.filter(topic=topic)
            .select_related('author')
            .order_by('created_at'),
        )
        roots = build_comment_tree(flat, topic.author_id)
        serializer = CommentSerializer(roots, many=True, context={'topic_author_id': topic.author_id, 'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=(permissions.IsAuthenticated,))
    def rate(self, request, slug=None):
        topic = self.get_object()
        score = request.data.get('score')
        try:
            score = int(score)
        except (TypeError, ValueError):
            raise ValidationError({'score': 'Оценка должна быть числом от 1 до 5.'})
        if score < 1 or score > 5:
            raise ValidationError({'score': 'Оценка должна быть от 1 до 5.'})

        ForumRating.objects.update_or_create(topic=topic, user=request.user, defaults={'score': score})

        ratings = ForumRating.objects.filter(topic=topic)
        count = ratings.count()
        avg = sum(r.score for r in ratings) / count if count else 0
        topic.avg_rating = round(avg, 2)
        topic.ratings_count = count
        topic.save(update_fields=['avg_rating', 'ratings_count'])
        return Response({'avg_rating': topic.avg_rating, 'ratings_count': topic.ratings_count})


class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.select_related('author', 'topic')
    serializer_class = CommentSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly)

    def perform_create(self, serializer):
        body = bleach.clean(serializer.validated_data.get('body', ''), tags=ALLOWED_HTML_TAGS, attributes=ALLOWED_HTML_ATTRS, strip=True)
        serializer.save(author=self.request.user, body=body)

    def perform_update(self, serializer):
        if 'body' in serializer.validated_data:
            body = bleach.clean(serializer.validated_data['body'], tags=ALLOWED_HTML_TAGS, attributes=ALLOWED_HTML_ATTRS, strip=True)
            serializer.save(body=body)
        else:
            serializer.save()


class AttachmentUploadView(APIView):
    """Загрузка текстового/код-файла к посту — только текст/код (whitelist
    расширений), без архивов и бинарников (решение пользователя), чтобы
    AttachmentsTerminal на фронте могло безопасно показать содержимое как
    обычный текст."""

    permission_classes = (permissions.IsAuthenticated,)
    parser_classes = (MultiPartParser,)

    def post(self, request):
        topic_id = request.data.get('topic')
        if not topic_id:
            raise ValidationError({'topic': 'Не передан id темы.'})
        try:
            topic = Topic.objects.get(pk=topic_id)
        except Topic.DoesNotExist:
            raise ValidationError({'topic': 'Тема не найдена.'})
        if topic.author_id != request.user.id:
            raise PermissionDenied('Прикладывать файлы может только автор поста.')
        if topic.attachments.count() >= MAX_ATTACHMENTS_PER_TOPIC:
            raise ValidationError({'file': f'Не более {MAX_ATTACHMENTS_PER_TOPIC} файлов на пост.'})

        upload = request.FILES.get('file')
        if upload is None:
            raise ValidationError({'file': 'Файл не передан.'})
        ext = upload.name.rsplit('.', 1)[-1].lower() if '.' in upload.name else ''
        if ext not in ALLOWED_ATTACHMENT_EXTENSIONS:
            raise ValidationError({'file': 'Разрешены только текстовые/код-файлы (.atm, .txt, .py, .js и т.п.).'})
        if upload.size > MAX_ATTACHMENT_BYTES:
            raise ValidationError({'file': 'Файл больше 200 КБ.'})

        unique_name = f'{uuid.uuid4().hex}.{ext}'
        attachment = ForumAttachment.objects.create(
            topic=topic,
            original_name=upload.name,
            size=upload.size,
        )
        attachment.file.save(unique_name, upload)
        return Response(ForumAttachmentSerializer(attachment).data, status=201)


class ImageUploadView(APIView):
    """Загрузка фото файлом для блока поста — альтернатива вводу готового URL
    (см. PostBlockEditor.jsx). В отличие от news.views.ImageUploadView доступно
    любому авторизованному — постить в Реакторе может каждый, не только мидл+."""

    permission_classes = (permissions.IsAuthenticated,)
    parser_classes = (MultiPartParser,)

    def post(self, request):
        upload = request.FILES.get('image')
        if upload is None:
            raise ValidationError({'image': 'Файл не передан.'})
        if upload.content_type not in ALLOWED_IMAGE_TYPES:
            raise ValidationError({'image': 'Разрешены только PNG, JPEG, WebP и GIF.'})
        if upload.size > MAX_IMAGE_BYTES:
            raise ValidationError({'image': 'Файл больше 5 МБ.'})

        ext = upload.name.rsplit('.', 1)[-1].lower() if '.' in upload.name else 'bin'
        path = default_storage.save(f'forum/blocks/{uuid.uuid4().hex}.{ext}', upload)
        url = request.build_absolute_uri(default_storage.url(path))
        return Response({'url': url}, status=201)
