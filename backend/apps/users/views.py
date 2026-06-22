import uuid

from django.core.files.storage import default_storage
from rest_framework import generics, permissions
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User
from .permissions import IsSeniorPlus
from .serializers import (
    DeveloperLevelUpdateSerializer,
    DeveloperSerializer,
    MemberSearchSerializer,
    PromoteToDeveloperSerializer,
    RegisterSerializer,
    UserSerializer,
)

# те же ограничения, что и для картинок новостей (apps/news/views.py) — общий
# здравый лимит для аватарки, без отдельного хранилища/CDN
ALLOWED_AVATAR_TYPES = {'image/png', 'image/jpeg', 'image/webp', 'image/gif'}
MAX_AVATAR_BYTES = 3 * 1024 * 1024


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        return self.request.user


class EmailTokenObtainPairView(TokenObtainPairView):
    permission_classes = (permissions.AllowAny,)


class AvatarUploadView(APIView):
    """Загрузка аватарки файлом — альтернатива вводу готового URL в настройках
    профиля. Каждый сам себе загружает аватар (в отличие от картинок новостей,
    тут не нужна роль мидл+), результат — просто URL, который кладётся в
    User.avatar_url тем же PATCH /auth/me/, что и раньше."""

    permission_classes = (permissions.IsAuthenticated,)
    parser_classes = (MultiPartParser,)

    def post(self, request):
        upload = request.FILES.get('avatar')
        if upload is None:
            raise ValidationError({'avatar': 'Файл не передан.'})
        if upload.content_type not in ALLOWED_AVATAR_TYPES:
            raise ValidationError({'avatar': 'Разрешены только PNG, JPEG, WebP и GIF.'})
        if upload.size > MAX_AVATAR_BYTES:
            raise ValidationError({'avatar': 'Файл больше 3 МБ.'})

        ext = upload.name.rsplit('.', 1)[-1].lower() if '.' in upload.name else 'bin'
        path = default_storage.save(f'avatars/{uuid.uuid4().hex}.{ext}', upload)
        url = request.build_absolute_uri(default_storage.url(path))
        return Response({'url': url}, status=201)


class DeveloperListView(generics.ListAPIView):
    """Публичный каталог разработчиков — поиск по имени или developer_key
    через ?search=, см. ## Предстоящие задачи в CLAUDE.md ("уникальный
    ключ-айди, по которому можно найти каждого разработчика")."""

    queryset = User.objects.filter(role__in=(User.Role.DEVELOPER, User.Role.ADMIN)).order_by('username')
    serializer_class = DeveloperSerializer
    permission_classes = (permissions.AllowAny,)

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search')
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(username__icontains=search) | Q(display_name__icontains=search) | Q(developer_key__iexact=search),
            )
        return qs


class DeveloperDetailView(generics.RetrieveAPIView):
    queryset = User.objects.filter(role__in=(User.Role.DEVELOPER, User.Role.ADMIN))
    serializer_class = DeveloperSerializer
    permission_classes = (permissions.AllowAny,)
    lookup_field = 'developer_key'
    lookup_url_kwarg = 'key'


class DeveloperLevelUpdateView(APIView):
    """Сменить уровень другого разработчика — только сеньор/admin."""

    permission_classes = (IsSeniorPlus,)

    def patch(self, request, key):
        developer = generics.get_object_or_404(User, developer_key=key, role=User.Role.DEVELOPER)
        serializer = DeveloperLevelUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        developer.developer_level = serializer.validated_data['developer_level']
        developer.save(update_fields=['developer_level'])
        return Response(DeveloperSerializer(developer).data)


class MemberSearchView(generics.ListAPIView):
    """Поиск уже зарегистрированных обычных участников (role=member) по имени
    или email — нужно сеньорам перед повышением до разработчика, чтобы не
    вводить username вручную наугад, а выбрать реального пользователя из
    выдачи. Не публичный (в отличие от DeveloperListView) — отдаёт email."""

    serializer_class = MemberSearchSerializer
    permission_classes = (IsSeniorPlus,)

    def get_queryset(self):
        qs = User.objects.filter(role=User.Role.MEMBER).order_by('username')
        search = self.request.query_params.get('search', '').strip()
        # поиск только по логину (username) — email приватен даже для сеньоров,
        # повышение до разработчика делается по логину (см. PromoteToDeveloperSerializer)
        if search:
            qs = qs.filter(username__icontains=search)
        return qs[:20]


class PromoteToDeveloperView(APIView):
    """Регистрация нового разработчика (повышение участника) — только
    сеньор/admin, см. ## Предстоящие задачи в CLAUDE.md."""

    permission_classes = (IsSeniorPlus,)

    def post(self, request):
        serializer = PromoteToDeveloperSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.get(username=serializer.validated_data['username'])
        user.role = User.Role.DEVELOPER
        user.developer_level = serializer.validated_data['developer_level']
        user.save()
        return Response(DeveloperSerializer(user).data, status=201)
