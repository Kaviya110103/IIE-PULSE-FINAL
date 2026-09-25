from pathlib import Path
from datetime import timedelta
import os

from dotenv import load_dotenv
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')

def getenv_bool(key, default=False):
    value = os.getenv(key, str(default))
    return str(value).strip().lower() in ('1', 'true', 'yes', 'on')

def env_list(key, default=None, sep=','):
    value = os.getenv(key)
    if value:
        return [item.strip() for item in value.split(sep) if item.strip()]
    return default or []

LOCAL_DOMAIN = os.getenv('LOCAL_DOMAIN', '127.0.0.1:8000').strip()
LOCAL_LAN_DOMAIN = os.getenv('LOCAL_LAN_DOMAIN', '127.0.0.1:8000').strip()
DEPLOYMENT_DOMAIN = os.getenv('DEPLOYMENT_DOMAIN', 'iiepulse.indrainstitute.com').strip()
DEPLOYMENT_SCHEME = os.getenv(
    'DEPLOYMENT_SCHEME',
    'http' if DEPLOYMENT_DOMAIN.startswith(('localhost', '127.0.0.1', '192.168.')) else 'https',
).strip()
DEPLOYMENT_ORIGIN = os.getenv('DEPLOYMENT_ORIGIN', f"{DEPLOYMENT_SCHEME}://{DEPLOYMENT_DOMAIN}").strip()
DEPLOYMENT_IS_LOCAL = DEPLOYMENT_DOMAIN.startswith(('localhost', '127.0.0.1', '192.168.'))
CSRF_TRUSTED_ORIGINS = env_list('DJANGO_CSRF_TRUSTED_ORIGINS', [
    DEPLOYMENT_ORIGIN,
    f'http://{LOCAL_DOMAIN}',
    f'http://{LOCAL_LAN_DOMAIN}',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://192.168.1.7:5173',
    'http://192.168.1.6:5173',
])
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third party
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',

    # Local
    'connect',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',

    'django.middleware.security.SecurityMiddleware',

    'whitenoise.middleware.WhiteNoiseMiddleware',  # 👈 ADD THIS

    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'connect.middleware.UserActivityLastSeenMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'IIE.urls'

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
            ],
        },
    },
]

WSGI_APPLICATION = 'IIE.wsgi.application'

DATABASE_URL = os.getenv('DATABASE_URL') or os.getenv('RAILWAY_DATABASE_URL')
DB_CONN_MAX_AGE = int(os.getenv('DB_CONN_MAX_AGE', 600))
DB_SSL = getenv_bool('DB_SSL', False)
_using_sqlite = not DATABASE_URL and not os.getenv('DB_NAME')

if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=DB_CONN_MAX_AGE,
            ssl_require=DB_SSL,
        )
    }
elif os.getenv('DB_NAME'):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.mysql',
            'NAME': os.getenv('DB_NAME'),
            'USER': os.getenv('DB_USER'),
            'PASSWORD': os.getenv('DB_PASSWORD'),
            'HOST': os.getenv('DB_HOST'),
            'PORT': os.getenv('DB_PORT'),
            'CONN_MAX_AGE': DB_CONN_MAX_AGE,
            'OPTIONS': {
                'charset': 'utf8mb4',
                'use_unicode': True,
                'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
                **({'ssl': {'ssl': {}}} if DB_SSL else {}),
            },
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

DEBUG = getenv_bool('DJANGO_DEBUG', _using_sqlite)

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY')
if not SECRET_KEY:
    if getenv_bool('DJANGO_DEBUG', _using_sqlite):
        SECRET_KEY = 'django-insecure-dev-only-change-before-production'
    else:
        raise ValueError('DJANGO_SECRET_KEY environment variable is required when DEBUG is disabled.')

ALLOWED_HOSTS = env_list('DJANGO_ALLOWED_HOSTS')
if not ALLOWED_HOSTS:
    ALLOWED_HOSTS = [
        DEPLOYMENT_DOMAIN,
    ]
if DEBUG or DEPLOYMENT_IS_LOCAL:
    ALLOWED_HOSTS.extend([
        LOCAL_DOMAIN.split(':')[0],
        LOCAL_LAN_DOMAIN.split(':')[0],
        'localhost',
        '127.0.0.1',
        '.local',
    ])
    ALLOWED_HOSTS.extend([f'192.168.1.{i}' for i in range(1, 255)])
for host in [DEPLOYMENT_DOMAIN.split(':')[0]]:
    if host and host not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(host)

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 300,
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

CORS_ALLOWED_ORIGINS = env_list(
    'CORS_ALLOWED_ORIGINS',
    CSRF_TRUSTED_ORIGINS,
)
CORS_ALLOW_ALL_ORIGINS = getenv_bool('CORS_ALLOW_ALL_ORIGINS', DEBUG)
CORS_ORIGIN_ALLOW_ALL = CORS_ALLOW_ALL_ORIGINS
CORS_ALLOW_CREDENTIALS = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = getenv_bool('DJANGO_SECURE_SSL_REDIRECT', not DEBUG and not DEPLOYMENT_IS_LOCAL)
SESSION_COOKIE_SECURE = getenv_bool('DJANGO_SESSION_COOKIE_SECURE', SECURE_SSL_REDIRECT)
CSRF_COOKIE_SECURE = getenv_bool('DJANGO_CSRF_COOKIE_SECURE', SECURE_SSL_REDIRECT)
SECURE_HSTS_SECONDS = int(os.getenv('DJANGO_SECURE_HSTS_SECONDS', 31536000 if not DEBUG and not DEPLOYMENT_IS_LOCAL else 0))
SECURE_HSTS_INCLUDE_SUBDOMAINS = getenv_bool('DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS', False)
SECURE_HSTS_PRELOAD = getenv_bool('DJANGO_SECURE_HSTS_PRELOAD', False)
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_L10N = True
USE_TZ = True

MEDIA_URL = '/media/'
MEDIA_ROOT = Path(os.getenv('DJANGO_MEDIA_ROOT', BASE_DIR / 'media'))

STATIC_URL = '/static/'

STATIC_ROOT = BASE_DIR / 'staticfiles'

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'  # 👈 ADD THIS

STATICFILES_DIRS = []

BREVO_API_KEY = os.getenv('BREVO_API_KEY', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', '')
DEFAULT_FROM_NAME = os.getenv('DEFAULT_FROM_NAME', 'IIE Pulse')
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = getenv_bool('EMAIL_USE_TLS', True)
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', DEFAULT_FROM_EMAIL)
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
APP_PORTAL_URL = os.getenv('APP_PORTAL_URL', DEPLOYMENT_ORIGIN if not DEBUG else '').rstrip('/')

MSG91_WIDGET_ID = os.getenv('MSG91_WIDGET_ID', '').strip()
MSG91_AUTH_TOKEN = os.getenv('MSG91_AUTH_TOKEN', '').strip()

X_FRAME_OPTIONS = os.getenv('DJANGO_X_FRAME_OPTIONS', 'DENY')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
NEWS_RSS_INTERVAL_SECONDS = int(os.getenv('NEWS_RSS_INTERVAL_SECONDS', '60'))
CHALLENGE_AI_PROVIDER = os.getenv('CHALLENGE_AI_PROVIDER', 'openai').strip().lower()
CHALLENGE_AI_MODEL = os.getenv('CHALLENGE_AI_MODEL', 'gpt-4o-mini').strip()
CHALLENGE_AI_API_KEY = os.getenv('CHALLENGE_AI_API_KEY', '').strip()
CHALLENGE_AI_API_URL = os.getenv('CHALLENGE_AI_API_URL', 'https://api.openai.com/v1/chat/completions').strip()
CHALLENGE_AI_TIMEOUT_SECONDS = int(os.getenv('CHALLENGE_AI_TIMEOUT_SECONDS', '30'))
CHALLENGE_AI_MAX_RETRIES = int(os.getenv('CHALLENGE_AI_MAX_RETRIES', '2'))

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}
