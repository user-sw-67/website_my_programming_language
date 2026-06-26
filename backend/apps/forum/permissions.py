from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.users.models import User


class IsAuthorOrReadOnly(BasePermission):
    """Менять/удалять тему или комментарий может только их автор."""

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return obj.author_id == request.user.id


class IsAdminOrReadOnly(BasePermission):
    """Категории создаёт/меняет только администратор — управление
    категориями убрано из Центра управления разработчиков (см. CLAUDE.md),
    остаётся только здесь и в служебной Django admin."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user.is_authenticated and request.user.role == User.Role.ADMIN)
