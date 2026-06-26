from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.text import slugify

from apps.news.models import transliterate

# whitelist расширений для вложений к посту — только текст/код, без архивов
# и бинарников (решение пользователя), чтобы AttachmentsTerminal на фронте
# могло безопасно показать содержимое как текст
ALLOWED_ATTACHMENT_EXTENSIONS = {
    'atm', 'txt', 'md', 'py', 'js', 'jsx', 'ts', 'tsx', 'cpp', 'cc', 'c', 'h', 'hpp',
    'json', 'csv', 'log', 'yaml', 'yml', 'ini', 'cfg', 'sh',
}
MAX_ATTACHMENT_BYTES = 200 * 1024  # 200 КБ на файл — этого достаточно для исходников, не для дампов
MAX_ATTACHMENTS_PER_TOPIC = 5


class ForumCategory(models.Model):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='forum_categories_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'forum categories'
        ordering = ('name',)

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(transliterate(self.name)) or 'category'
            slug = base
            counter = 1
            while ForumCategory.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                counter += 1
                slug = f'{base}-{counter}'
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Topic(models.Model):
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='topics')
    title = models.CharField(max_length=200)
    # уникальный человекочитаемый URL — тот же паттерн, что у NewsPost.slug
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    # короткий тизер для карточки ленты («тема» в требованиях) — как NewsPost.summary
    summary = models.CharField(max_length=280, blank=True)
    body = models.TextField(blank=True)
    category = models.ForeignKey(
        ForumCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='topics',
    )
    tags = models.JSONField(default=list, blank=True)
    # содержимое поста — список из 0..10 блоков {"text": html, "image": url},
    # text приходит из Tiptap и санитизируется в TopicViewSet перед сохранением
    blocks = models.JSONField(default=list, blank=True)
    github_url = models.URLField(blank=True)
    is_resolved = models.BooleanField(default=False)
    # скрыт от всех кроме автора; всё равно учитывается в рейтинге автора —
    # защита от читерства (нельзя скрыть пост с плохой оценкой и не потерять её)
    is_hidden = models.BooleanField(default=False)
    # денормализованные агрегаты ForumRating — пересчитываются в RatingView,
    # чтобы не агрегировать голоса на каждый GET ленты/страницы поста
    avg_rating = models.FloatField(default=0)
    ratings_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-created_at',)

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(transliterate(self.title)) or 'topic'
            slug = base
            counter = 1
            while Topic.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                counter += 1
                slug = f'{base}-{counter}'
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


def attachment_upload_path(instance, filename):
    return f'forum/{instance.topic_id}/{filename}'


class ForumAttachment(models.Model):
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to=attachment_upload_path)
    original_name = models.CharField(max_length=255)
    size = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.original_name


class Comment(models.Model):
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='forum_comments')
    # parent=None — комментарий первого уровня; иначе — ответ на другой
    # комментарий (adjacency list, глубина не ограничена)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    # rich-text из Tiptap (тот же редактор, что у блоков поста) — санитизируется
    # в CommentViewSet через bleach. Ссылки «на строки файла» (filename:12-18)
    # — это обычные <a class="comment-ref-link" data-ref-*> внутри body, а не
    # отдельная структура в БД: пользователь выделяет такой текст в редакторе
    # и кнопкой превращает выделение в ссылку, поэтому ограничения на
    # количество ссылок в одном комментарии практически нет.
    body = models.TextField()
    is_accepted_answer = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('created_at',)


class ForumRating(models.Model):
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='ratings')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='forum_ratings')
    score = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('topic', 'user')
