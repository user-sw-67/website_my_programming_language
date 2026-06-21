import base64

import requests

GITHUB_API = 'https://api.github.com'


class GithubServiceError(Exception):
    pass


class GithubService:
    """Тонкая обёртка над GitHub REST API на токене, который social-auth-app-django
    сохраняет при логине пользователя через GitHub (см. SOCIAL_AUTH_GITHUB_SCOPE=['repo'])."""

    def __init__(self, user):
        social = user.social_auth.filter(provider='github').first()
        if not social or not social.access_token:
            raise GithubServiceError('GitHub-аккаунт не подключён. Войдите через GitHub в шапке сайта.')
        self.token = social.access_token
        self.headers = {
            'Authorization': f'token {self.token}',
            'Accept': 'application/vnd.github+json',
        }

    def _login(self):
        resp = requests.get(f'{GITHUB_API}/user', headers=self.headers, timeout=10)
        if resp.status_code != 200:
            raise GithubServiceError(f'Не удалось получить профиль GitHub: {resp.status_code}')
        return resp.json()['login']

    def get_or_create_repo(self, name, private=False):
        login = self._login()
        resp = requests.get(f'{GITHUB_API}/repos/{login}/{name}', headers=self.headers, timeout=10)
        if resp.status_code == 200:
            return resp.json()

        resp = requests.post(
            f'{GITHUB_API}/user/repos',
            headers=self.headers,
            json={'name': name, 'private': private, 'auto_init': True},
            timeout=10,
        )
        if resp.status_code >= 300:
            raise GithubServiceError(f'GitHub API ({resp.status_code}): {resp.text}')
        return resp.json()

    def push_files(self, repo_full_name, files, message):
        for path, content in files.items():
            self._put_file(repo_full_name, path, content, message)

    def _put_file(self, repo_full_name, path, content, message):
        url = f'{GITHUB_API}/repos/{repo_full_name}/contents/{path}'
        existing = requests.get(url, headers=self.headers, timeout=10)
        sha = existing.json().get('sha') if existing.status_code == 200 else None

        payload = {
            'message': message,
            'content': base64.b64encode(content.encode('utf-8')).decode('ascii'),
        }
        if sha:
            payload['sha'] = sha

        resp = requests.put(url, headers=self.headers, json=payload, timeout=10)
        if resp.status_code >= 300:
            raise GithubServiceError(f'Не удалось записать {path} ({resp.status_code}): {resp.text}')
