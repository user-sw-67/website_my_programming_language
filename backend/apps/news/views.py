from django.utils import timezone
from rest_framework import viewsets
from rest_framework.exceptions import Throttled
from rest_framework.pagination import PageNumberPagination

from .models import NewsPost
from .permissions import IsMiddlePlusOrReadOnly
from .serializers import NewsPostSerializer

# не чаще одной новости в 6 часов на автора — чтобы лента новостей не
# захлёбывалась от одного слишком активного автора
NEWS_COOLDOWN = timezone.timedelta(hours=6)


class NewsPagination(PageNumberPagination):
    page_size = 10
    # фронтенду нужно изредка забрать более широкую выборку — например, чтобы
    # посчитать частоту тегов для облака тегов (см. NewsPage.jsx)
    page_size_query_param = 'page_size'
    max_page_size = 100


class NewsPostViewSet(viewsets.ModelViewSet):
    serializer_class = NewsPostSerializer
    permission_classes = (IsMiddlePlusOrReadOnly,)
    pagination_class = NewsPagination
    lookup_field = 'slug'

    def get_queryset(self):
        qs = NewsPost.objects.filter(is_published=True)
        params = self.request.query_params
        # один общий поиск — по заголовку, тизеру и имени автора сразу
        # (решение пользователя: не плодить отдельные поля поиска). Текст
        # самой статьи (body) сознательно не ищется — слишком много шума
        # от случайных совпадений слов внутри длинного текста блоков
        search = params.get('search')
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(title__icontains=search)
                | Q(summary__icontains=search) | Q(author__username__icontains=search),
            )
        # ?tags=a,b,c — новость подходит, если у неё есть хотя бы ОДИН из
        # выбранных тегов (OR, не пересечение); до 5 тегов одновременно
        # ограничивает сам фронтенд (NewsPage.jsx), здесь не дублируем лимит
        tags_param = params.get('tags') or params.get('tag')  # tag — для обратной совместимости
        if tags_param:
            from django.db.models import Q
            selected = [t.strip() for t in tags_param.split(',') if t.strip()][:5]
            tag_q = Q()
            for t in selected:
                tag_q |= Q(tags__contains=[t])
            qs = qs.filter(tag_q)
        return qs

    def perform_create(self, serializer):
        last = NewsPost.objects.filter(author=self.request.user).order_by('-created_at').first()
        if last and timezone.now() - last.created_at < NEWS_COOLDOWN:
            wait_left = NEWS_COOLDOWN - (timezone.now() - last.created_at)
            raise Throttled(detail=f'Можно публиковать не чаще раза в 6 часов. Подождите ещё {wait_left.seconds // 60} мин.')
        # body больше не вводится отдельным полем формы — склеиваем текст
        # блоков, чтобы общий поиск (?search=) по новостям продолжал работать
        blocks = serializer.validated_data.get('blocks', [])
        body = '\n\n'.join(b.get('text', '').strip() for b in blocks).strip()
        serializer.save(author=self.request.user, is_published=True, published_at=timezone.now(), body=body)
