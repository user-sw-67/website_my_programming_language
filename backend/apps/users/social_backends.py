import requests
from requests.adapters import HTTPAdapter
from social_core.backends.github import GithubOAuth2
from social_core.backends.google import GoogleOAuth2
from social_core.exceptions import AuthConnectionError
from social_core.utils import user_agent
from urllib3.util.retry import Retry


def _retrying_session():
    """Сеть из контейнера до api.github.com/accounts.google.com нестабильна
    (то отвечает за доли секунды, то рвётся по SSL/connection error) — вместо
    одного хрупкого запроса с долгим таймаутом делаем несколько быстрых
    попыток подряд, это и быстрее в среднем, и надёжнее."""
    session = requests.Session()
    # total=1 — ровно один повтор (2 попытки всего). connect/read намеренно
    # НЕ задаём отдельно: они считаются НЕЗАВИСИМО от total и складываются,
    # из-за чего реальное число попыток оказывается больше задуманного и
    # худший случай становится медленнее, а не быстрее
    retry = Retry(
        total=1,
        backoff_factor=0.2,
        status_forcelist=(500, 502, 503, 504),
        allowed_methods=frozenset(['GET', 'POST']),
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount('https://', adapter)
    session.mount('http://', adapter)
    return session


class RetryingRequestMixin:
    def request(self, url, method='GET', *, headers=None, data=None, auth=None, params=None):
        headers = {} if headers is None else dict(headers)
        timeout = self.setting('REQUESTS_TIMEOUT') or self.setting('URLOPEN_TIMEOUT')
        if self.SEND_USER_AGENT and 'User-Agent' not in headers:
            headers['User-Agent'] = self.setting('USER_AGENT') or user_agent()

        session = _retrying_session()
        try:
            response = session.request(
                method,
                url,
                headers=headers,
                data=data,
                auth=auth,
                params=params,
                timeout=timeout,
                proxies=self.setting('PROXIES'),
                verify=self.setting('VERIFY_SSL', True),
            )
        except requests.ConnectionError as err:
            raise AuthConnectionError(self, str(err)) from err
        response.raise_for_status()
        return response


class FastGithubOAuth2(RetryingRequestMixin, GithubOAuth2):
    pass


class FastGoogleOAuth2(RetryingRequestMixin, GoogleOAuth2):
    pass
