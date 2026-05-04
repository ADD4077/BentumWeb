"""
Settings loader.

Keeps `backend.settings` as a stable import path while routing to
environment-specific settings modules.
"""

import os
from importlib import import_module


def _detect_environment() -> str:
    explicit_env = os.getenv("DJANGO_ENV", "").strip().lower()
    if explicit_env in {"dev", "development"}:
        return "dev"
    if explicit_env in {"prod", "production"}:
        return "prod"

    debug_value = os.getenv("DEBUG", "").strip().lower()
    if debug_value in {"1", "true", "yes", "on"}:
        return "dev"

    return "prod"


_settings_module = import_module(f"backend.settings_{_detect_environment()}")

for _name in dir(_settings_module):
    if _name.isupper():
        globals()[_name] = getattr(_settings_module, _name)
