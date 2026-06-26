from rest_framework import serializers

from apps.users.serializers import PublicUserSerializer

from .models import Comment, ForumAttachment, ForumCategory, ForumRating, Topic


class ForumCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ForumCategory
        fields = ('id', 'name', 'slug', 'description', 'created_at')
        read_only_fields = ('id', 'slug', 'created_at')


class ForumAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ForumAttachment
        fields = ('id', 'file', 'original_name', 'size', 'created_at')
        read_only_fields = fields


class CommentSerializer(serializers.ModelSerializer):
    """Автор + рекурсивно собранные ответы. Дерево строится один раз в
    TopicViewSet/CommentViewSet (один SQL-запрос на все комментарии темы) и
    передаётся сюда уже готовым — `replies` рекурсивно сериализует то, что
    положил туда вызывающий код, без дополнительных запросов к БД.

    body — rich-text из Tiptap (см. CommentEditor.jsx), санитизируется в
    CommentViewSet через bleach. Ссылки «на строки файла» (filename:12-18) —
    это обычные <a class="comment-ref-link" data-ref-*> внутри body, а не
    отдельное поле — пользователь выделяет такой текст и кнопкой превращает
    его в ссылку, поэтому ограничения на количество ссылок в комментарии нет."""

    author = PublicUserSerializer(read_only=True)
    replies = serializers.SerializerMethodField()
    is_topic_author = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = (
            'id', 'topic', 'author', 'parent', 'body',
            'is_accepted_answer', 'is_topic_author', 'created_at', 'replies',
        )
        read_only_fields = ('id', 'created_at')

    def get_replies(self, obj):
        children = getattr(obj, '_children', None)
        if children is None:
            return []
        return CommentSerializer(children, many=True, context=self.context).data

    def get_is_topic_author(self, obj):
        topic_author_id = self.context.get('topic_author_id')
        if topic_author_id is None:
            topic_author_id = obj.topic.author_id
        return obj.author_id == topic_author_id


def build_comment_tree(comments, topic_author_id):
    """comments — плоский QuerySet/list всех комментариев темы (один запрос,
    select_related('author')). Собирает дерево в Python через словарь по id,
    чтобы CommentSerializer.get_replies не делал запросов на каждом уровне."""

    by_id = {c.id: c for c in comments}
    roots = []
    for c in by_id.values():
        c._children = []
    for c in by_id.values():
        if c.parent_id and c.parent_id in by_id:
            by_id[c.parent_id]._children.append(c)
        elif not c.parent_id:
            roots.append(c)
    return roots


class TopicListSerializer(serializers.ModelSerializer):
    """Лёгкая версия для ленты — без blocks/комментариев/вложений."""

    author = PublicUserSerializer(read_only=True)
    category = ForumCategorySerializer(read_only=True)
    comments_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Topic
        fields = (
            'id', 'slug', 'author', 'title', 'summary', 'category', 'tags',
            'is_resolved', 'is_hidden', 'avg_rating', 'ratings_count',
            'comments_count', 'created_at',
        )
        read_only_fields = fields


class TopicDetailSerializer(serializers.ModelSerializer):
    author = PublicUserSerializer(read_only=True)
    category = ForumCategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        source='category', queryset=ForumCategory.objects.all(), write_only=True, required=False, allow_null=True,
    )
    attachments = ForumAttachmentSerializer(many=True, read_only=True)
    my_rating = serializers.SerializerMethodField()

    class Meta:
        model = Topic
        fields = (
            'id', 'slug', 'author', 'title', 'summary', 'body', 'category', 'category_id',
            'tags', 'blocks', 'github_url', 'is_resolved', 'is_hidden',
            'avg_rating', 'ratings_count', 'my_rating', 'attachments', 'created_at',
        )
        read_only_fields = ('id', 'slug', 'author', 'avg_rating', 'ratings_count', 'created_at')

    def get_my_rating(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        rating = obj.ratings.filter(user=request.user).first()
        return rating.score if rating else None

    def validate_blocks(self, value):
        if len(value) > 10:
            raise serializers.ValidationError('Не более 10 блоков в посте.')
        return value


class ForumRatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ForumRating
        fields = ('id', 'topic', 'score', 'created_at')
        read_only_fields = ('id', 'created_at')
