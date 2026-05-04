"""
Development Django settings.
"""

from .settings_base import *  # noqa: F403,F401

DEBUG = env_bool("DEBUG", True)  # noqa: F405

ALLOWED_HOSTS = env_list(  # noqa: F405
    "DJANGO_ALLOWED_HOSTS",
    ["127.0.0.1", "localhost"],
)

SESSION_COOKIE_SECURE = env_bool("SESSION_COOKIE_SECURE", False)  # noqa: F405
CSRF_COOKIE_SECURE = env_bool("CSRF_COOKIE_SECURE", False)  # noqa: F405

CORS_ALLOWED_ORIGINS = env_list(  # noqa: F405
    "CORS_ALLOWED_ORIGINS",
    [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
)

CSRF_TRUSTED_ORIGINS = env_list(  # noqa: F405
    "CSRF_TRUSTED_ORIGINS",
    [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
)
