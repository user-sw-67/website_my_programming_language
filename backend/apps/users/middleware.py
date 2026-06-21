import logging

import requests
from django.conf import settings
from django.shortcuts import redirect

logger = logging.getLogger(__name__)


class SocialAuthNetworkErrorMiddleware:
    """Сеть из контейнера до api.github.com/accounts.google.com бывает
    нестабильна. social_core оборачивает requests.ConnectionError в свой
    AuthConnectionError (его ловит SocialAuthExceptionMiddleware), но
    requests.Timeout — не ConnectionError, и долетает до Django необработанным
    (500 вместо аккуратного редиректа). Ловим здесь любую сетевую ошибку."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_exception(self, request, exception):
        if isinstance(exception, requests.exceptions.RequestException):
            logger.warning('OAuth: сетевая ошибка при обращении к провайдеру: %s', exception)
            return redirect(settings.SOCIAL_AUTH_LOGIN_ERROR_URL)
        return None
