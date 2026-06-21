from django.conf import settings
from django.shortcuts import redirect
from rest_framework_simplejwt.tokens import RefreshToken


def issue_jwt_and_redirect(strategy, user, *args, **kwargs):
    """Завершающий шаг social-auth pipeline: выдаёт JWT и редиректит на
    фронтенд с токенами в query-параметрах — фронтенд (AuthContext) их
    подхватывает и сохраняет в localStorage."""
    refresh = RefreshToken.for_user(user)
    url = f'{settings.SOCIAL_AUTH_LOGIN_REDIRECT_URL}?token={refresh.access_token}&refresh={refresh}'
    return redirect(url)
