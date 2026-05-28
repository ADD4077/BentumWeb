"""
Shared Django settings for all environments.
"""

import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
try:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
except ImportError:
    sentry_sdk = None
    DjangoIntegration = None

BASE_DIR = Path(__file__).resolve().parent.parent


def env_bool(name: str, default: bool = False) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_list(name: str, default: list[str] | None = None) -> list[str]:
    value = os.environ.get(name)
    if value is None:
        return list(default or [])
    return [item.strip() for item in value.split(",") if item.strip()]


def env_float(name: str, default: float = 0.0) -> float:
    value = os.environ.get(name)
    if value is None:
        return default
    try:
        return float(value)
    except ValueError:
        return default


def env_int(name: str, default: int = 0) -> int:
    value = os.environ.get(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


DEBUG = env_bool("DEBUG", False)
DJANGO_ENV = os.environ.get("DJANGO_ENV", "dev").strip().lower()
APP_VERSION = os.environ.get("APP_VERSION", "").strip() or None

SENTRY_DSN = os.environ.get("SENTRY_DSN", "").strip()
if SENTRY_DSN and sentry_sdk and DjangoIntegration:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration()],
        environment=os.environ.get("SENTRY_ENVIRONMENT", DJANGO_ENV),
        release=APP_VERSION,
        send_default_pii=False,
        traces_sample_rate=env_float("SENTRY_TRACES_SAMPLE_RATE", 0.0),
    )

STATIC_ROOT = BASE_DIR / "static"
STATIC_URL = "/static/"

if DEBUG:
    STATICFILES_STORAGE = "django.contrib.staticfiles.storage.StaticFilesStorage"
else:
    STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

WHITENOISE_USE_FINDERS = DEBUG
WHITENOISE_MAX_AGE = 0 if DEBUG else 31536000

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "").strip()
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = "django-insecure-dev-only-key"
    else:
        raise ImproperlyConfigured("DJANGO_SECRET_KEY must be configured when DEBUG is disabled.")
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", ["127.0.0.1"])

SESSION_COOKIE_SECURE = env_bool("SESSION_COOKIE_SECURE", not DEBUG)
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_AGE = 60 * 60 * 24 * 30
SESSION_EXPIRE_AT_BROWSER_CLOSE = False
CSRF_COOKIE_SECURE = env_bool("CSRF_COOKIE_SECURE", not DEBUG)
CSRF_COOKIE_SAMESITE = "Lax"
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", not DEBUG)
SECURE_HSTS_SECONDS = env_int("SECURE_HSTS_SECONDS", 31536000 if not DEBUG else 0)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", not DEBUG)
SECURE_HSTS_PRELOAD = env_bool("SECURE_HSTS_PRELOAD", not DEBUG)
SECURE_CONTENT_TYPE_NOSNIFF = env_bool("SECURE_CONTENT_TYPE_NOSNIFF", True)
SECURE_REFERRER_POLICY = os.environ.get("SECURE_REFERRER_POLICY", "same-origin").strip() or "same-origin"
X_FRAME_OPTIONS = os.environ.get("X_FRAME_OPTIONS", "DENY").strip() or "DENY"

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    "rest_framework",
    "api.apps.ApiConfig",
]

CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS", [])
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS", [])

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "api.common.middleware.UpdateLastLoginMiddleware",
    "api.common.middleware.EnforceActiveBanMiddleware",
    "api.security.twofa.middleware.TwoFAAuthenticationMiddleware",
]

ROOT_URLCONF = "backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "backend.wsgi.application"
ASGI_APPLICATION = "backend.asgi.application"

if env_bool("DJANGO_TEST_USE_SQLITE", False):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "test.sqlite3",
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": f"django.db.backends.{os.getenv('DATABASE_ENGINE', 'mysql')}",
            "NAME": os.getenv("DATABASE_NAME", "dockerdjango"),
            "USER": os.getenv("DATABASE_USERNAME", "root"),
            "PASSWORD": os.getenv("DATABASE_PASSWORD", "root"),
            "HOST": os.getenv("DATABASE_HOST", "localhost"),
            "PORT": os.getenv("DATABASE_PORT", "3306"),
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

LANGUAGE_CODE = "ru-ru"
TIME_ZONE = "Europe/Moscow"
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "api.User"

REDIS_URL = os.getenv("REDIS_URL", "").strip()
if REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": REDIS_URL,
        }
    }
else:
    if not DEBUG:
        raise ImproperlyConfigured("REDIS_URL must be configured when DEBUG is disabled.")
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "bentum-cache",
        }
    }

LOGIN_RATE_LIMIT_ATTEMPTS = int(os.getenv("LOGIN_RATE_LIMIT_ATTEMPTS", 5))
LOGIN_RATE_LIMIT_TTL_SECONDS = int(os.getenv("LOGIN_RATE_LIMIT_TTL_SECONDS", 900))
TWOFA_CODE_TTL_SECONDS = int(os.getenv("TWOFA_CODE_TTL_SECONDS", 300))
TWOFA_VERIFY_MAX_ATTEMPTS = int(os.getenv("TWOFA_VERIFY_MAX_ATTEMPTS", 6))
TWOFA_RESEND_COOLDOWN_SECONDS = int(os.getenv("TWOFA_RESEND_COOLDOWN_SECONDS", 120))
BACKGROUND_JOB_STALE_TIMEOUT_SECONDS = int(os.getenv("BACKGROUND_JOB_STALE_TIMEOUT_SECONDS", 1800))
TRUST_X_FORWARDED_FOR = env_bool("TRUST_X_FORWARDED_FOR", False)
SCHEDULE_SYNC_MIN_ENTRIES = env_int("SCHEDULE_SYNC_MIN_ENTRIES", 1)
SCHEDULE_SYNC_MIN_EXISTING_RATIO = env_float("SCHEDULE_SYNC_MIN_EXISTING_RATIO", 0.5)

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
    ],
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Bentum API",
    "DESCRIPTION": "API для образовательной платформы Бентум",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
TELEGRAM_TOPIC_ID = 9
TELEGRAM_NEW_USERS_TOPIC_ID = 3
WEB_APP_URL = os.getenv("WEB_APP_URL", "https://bentum.ru")
TELEGRAM_INTERNAL_API_TOKEN = os.getenv("TELEGRAM_INTERNAL_API_TOKEN", "").strip()
