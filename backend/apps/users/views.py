from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User
from .permissions import IsSeniorPlus
from .serializers import (
    DeveloperLevelUpdateSerializer,
    DeveloperSerializer,
    PromoteToDeveloperSerializer,
    RegisterSerializer,
    UserSerializer,
)


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
            qs = qs.filter(Q(username__icontains=search) | Q(developer_key__iexact=search))
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
