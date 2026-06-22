from rest_framework import serializers

from apps.users.serializers import PublicUserSerializer

from .models import NewsPost


class NewsPostSerializer(serializers.ModelSerializer):
    author = PublicUserSerializer(read_only=True)

    class Meta:
        model = NewsPost
        fields = (
            'id', 'slug', 'author', 'title', 'summary', 'body', 'cover_image', 'blocks', 'tags',
            'is_published', 'published_at', 'created_at',
        )
        # body больше не вводится руками — собирается из текста блоков
        # (см. NewsPostViewSet.perform_create), поэтому он read-only
        read_only_fields = ('id', 'slug', 'body', 'created_at')

    def validate_tags(self, value):
        if len(value) > 2:
            raise serializers.ValidationError('Не больше 2 тегов на новость.')
        return value

    def validate_blocks(self, value):
        if not isinstance(value, list) or not 1 <= len(value) <= 7:
            raise serializers.ValidationError('Новость должна состоять из 1–7 блоков.')
        for block in value:
            if not isinstance(block, dict) or not block.get('text', '').strip():
                raise serializers.ValidationError('У каждого блока должен быть текст.')
        return value

    def validate(self, attrs):
        # обложка не вводится отдельным полем — это выбор одной из фотографий,
        # уже приложенных к блокам, поэтому это значение обязано совпадать
        # с image одного из блоков (или быть пустым, если автор без обложки)
        cover = attrs.get('cover_image', '')
        blocks = attrs.get('blocks', [])
        if cover:
            block_images = {b.get('image', '') for b in blocks if b.get('image')}
            if cover not in block_images:
                raise serializers.ValidationError({
                    'cover_image': 'Обложка должна быть одной из фотографий, приложенных к блокам.',
                })
        return attrs
