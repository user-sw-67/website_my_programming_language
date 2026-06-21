from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsMiddlePlusOrReadOnly(BasePermission):
    """Публиковать новости может мидл/сеньор-разработчик или admin (junior — нет,
    он только просматривает и отвечает на отзывы, см. User.is_middle_plus)."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user.is_authenticated and request.user.is_middle_plus)
