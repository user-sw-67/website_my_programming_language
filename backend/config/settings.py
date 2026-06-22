from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DEBUG=(bool, False),
)
environ.Env.read_env(BASE_DIR.parent / '.env')

SECRET_KEY = env('DJANGO_SECRET_KEY', default='insecure-dev-key-change-me')
DEBUG = env('DEBUG')
ALLOWED_HOSTS = env.list('DJANGO_ALLOWED_HOSTS', default=['localhost', '127.0.0.1'])

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'social_django',
    'django_celery_beat',
    'channels',
    'drf_spectacular',
    'apps.users',
    'apps.projects',
    'apps.forum',
    'apps.issues',
    'apps.feedback',
    'apps.news',
    'apps.support_chat',
    'apps.activitylog',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'social_django.middleware.SocialAuthExceptionMiddleware',
    'apps.users.middleware.SocialAuthNetworkErrorMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'apps.activitylog.middleware.ActivityLogMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'social_django.context_processors.backends',
                'social_django.context_processors.login_redirect',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

DATABASES = {
    'default': env.db('DATABASE_URL', default='postgres://atm:atm@postgres:5432/atm'),
}

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': env('REDIS_URL', default='redis://redis:6379/1'),
    }
}

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [env('REDIS_URL', default='redis://redis:6379/1')],
        },
    },
}

CELERY_BROKER_URL = env('REDIS_URL', default='redis://redis:6379/0')
CELERY_RESULT_BACKEND = env('REDIS_URL', default='redis://redis:6379/0')
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

AUTH_USER_MODEL = 'users.User'

AUTHENTICATION_BACKENDS = (
    # свои подклассы с retry на HTTP-запросах к провайдеру — обычные
    # GoogleOAuth2/GithubOAuth2 делают один хрупкий запрос, см.
    # apps/users/social_backends.py
    'apps.users.social_backends.FastGoogleOAuth2',
    'apps.users.social_backends.FastGithubOAuth2',
    'django.contrib.auth.backends.ModelBackend',
)

SOCIAL_AUTH_GOOGLE_OAUTH2_KEY = env('GOOGLE_OAUTH2_KEY', default='')
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET = env('GOOGLE_OAUTH2_SECRET', default='')
SOCIAL_AUTH_GITHUB_KEY = env('GITHUB_OAUTH2_KEY', default='')
SOCIAL_AUTH_GITHUB_SECRET = env('GITHUB_OAUTH2_SECRET', default='')
# scope 'repo' нужен, чтобы потом коммитить проекты пользователя на GitHub
# (apps/projects/github_service.py); 'user:email' — чтобы GitHub отдавал email
# даже при приватных настройках профиля (без него associate_by_email не сможет
# связать GitHub-логин с уже существующим аккаунтом на этот же email)
SOCIAL_AUTH_GITHUB_SCOPE = ['repo', 'user:email']

# таймаут НА ОДНУ попытку (а не на весь логин) — FastGithubOAuth2/
# FastGoogleOAuth2 делают ровно один повтор при сетевом сбое (см.
# apps/users/social_backends.py), поэтому само значение держим небольшим:
# типичный успешный ответ — доли секунды, а худший случай (2 попытки по 3с
# + небольшой backoff) укладывается в ~6.5с — не дольше, чем раньше без retry
SOCIAL_AUTH_REQUESTS_TIMEOUT = 3

SOCIAL_AUTH_URL_NAMESPACE = 'social'
LOGIN_REDIRECT_URL = env('FRONTEND_URL', default='http://localhost') + '/'
SOCIAL_AUTH_LOGIN_REDIRECT_URL = LOGIN_REDIRECT_URL
SOCIAL_AUTH_RAISE_EXCEPTIONS = False
# куда увести пользователя, если пайплайн всё же упадёт — путь самого
# фронтенда (а не /login/error/ по умолчанию, которого нет в React Router)
SOCIAL_AUTH_LOGIN_ERROR_URL = LOGIN_REDIRECT_URL

SOCIAL_AUTH_PIPELINE = (
    'social_core.pipeline.social_auth.social_details',
    'social_core.pipeline.social_auth.social_uid',
    'social_core.pipeline.social_auth.auth_allowed',
    'social_core.pipeline.social_auth.social_user',
    # связываем с уже существующим аккаунтом по email вместо ошибки
    # о дублирующемся email при создании нового пользователя
    'social_core.pipeline.social_auth.associate_by_email',
    'social_core.pipeline.user.get_username',
    'social_core.pipeline.user.create_user',
    'social_core.pipeline.social_auth.associate_user',
    'social_core.pipeline.social_auth.load_extra_data',
    'social_core.pipeline.user.user_details',
    # последний шаг: выдаём JWT и редиректим на фронтенд с токеном в query
    'apps.users.pipeline.issue_jwt_and_redirect',
)

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'ATOM Platform API',
    'DESCRIPTION': 'Документация REST API для веб-платформы языка ATOM',
    'VERSION': '0.1.0',
}

CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=['http://localhost:5173'])

LANGUAGE_CODE = 'ru-ru'
TIME_ZONE = 'Europe/Warsaw'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# своего S3/CDN пока нет — картинки новостей (см. apps/news/views.py::ImageUploadView)
# лежат на диске рядом с кодом, том ./backend:/app в docker-compose.yml уже их
# сохраняет между перезапусками контейнера
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
