from rest_framework.permissions import BasePermission


class IsSeniorPlus(BasePermission):
    """Раздавать/менять уровни разработчиков может только сеньор-разработчик
    или admin, см. User.is_senior_plus."""

    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and request.user.is_senior_plus)
