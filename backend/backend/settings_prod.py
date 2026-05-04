"""
Production Django settings.
"""

from django.core.exceptions import ImproperlyConfigured

from .settings_base import *  # noqa: F403,F401

DEBUG = env_bool("DEBUG", False)  # noqa: F405

if SECRET_KEY == "django-insecure-change-this-in-production":  # noqa: F405
    raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set in production.")

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", [])  # noqa: F405
if not ALLOWED_HOSTS:
    raise ImproperlyConfigured("DJANGO_ALLOWED_HOSTS must be set in production.")

SESSION_COOKIE_SECURE = env_bool("SESSION_COOKIE_SECURE", True)  # noqa: F405
CSRF_COOKIE_SECURE = env_bool("CSRF_COOKIE_SECURE", True)  # noqa: F405

CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS", [])  # noqa: F405
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS", [])  # noqa: F405
