from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsDeveloperToRespond(BasePermission):
    """Создать отзыв может любой авторизованный, ответить на него — только
    разработчик (junior и выше) или admin, редактировать/удалять — только автор.
    Без object-level проверки на update/destroy раньше мог любой авторизованный
    пользователь менять чужие отзывы — это тоже починено здесь."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        if not request.user.is_authenticated:
            return False
        if view.action == 'respond':
            return request.user.is_developer
        return True

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        if view.action == 'respond':
            return request.user.is_developer
        return obj.author_id == request.user.id
