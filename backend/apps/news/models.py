from django.conf import settings
from django.db import models
from django.utils.text import slugify

# Django's slugify() с allow_unicode=False просто выбрасывает кириллицу
# (получился бы пустой слаг для русских заголовков) — транслитерируем сами,
# чтобы URL вида /news/<slug> были читаемыми латиницей, а не процент-кодом
CYRILLIC_TO_LATIN = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'i', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'c',
    'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
}


def transliterate(text):
    return ''.join(CYRILLIC_TO_LATIN.get(ch, ch) for ch in text.lower())


class NewsPost(models.Model):
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='news_posts')
    title = models.CharField(max_length=200)
    # уникальный человекочитаемый URL вместо /news/<id> — генерируется из
    # заголовка автоматически в save(), руками не задаётся
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    # короткий тизер для карточки в списке/превью на главной — если не задан,
    # фронтенд сам обрезает body (см. NewsPage.jsx)
    summary = models.CharField(max_length=280, blank=True)
    # body хранится для поиска (search__icontains) и как фоллбэк-тизер на
    # старых местах фронтенда — собирается автоматически из текста блоков
    # (см. NewsPostSerializer.create), отдельного поля в форме создания нет
    body = models.TextField()
    # URL картинки, не файл — своего хранилища медиа пока нет, тот же подход,
    # что и у User.avatar_url. Не вводится отдельно: автор выбирает обложку
    # из фотографий, уже приложенных к одному из блоков (см. blocks ниже)
    cover_image = models.URLField(blank=True)
    # содержимое статьи — список из 1..7 блоков {"text": str, "image": url}.
    # Каждый блок может (не обязательно) иметь фото — на странице новости
    # рендерится текстом рядом с фото, поочерёдно слева/справа (см.
    # NewsDetailPage.jsx), а не одним сплошным текстом
    blocks = models.JSONField(default=list, blank=True)
    tags = models.JSONField(default=list, blank=True)
    is_published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-published_at', '-created_at')

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(transliterate(self.title)) or 'news'
            slug = base
            counter = 1
            while NewsPost.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                counter += 1
                slug = f'{base}-{counter}'
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title
