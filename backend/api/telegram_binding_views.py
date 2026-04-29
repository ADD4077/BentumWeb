"""Legacy compatibility wrappers for Telegram binding endpoints."""

from .integrations.telegram.views import (
    generate_telegram_link,
    get_telegram_binding_status,
    process_telegram_callback,
    unlink_telegram_account,
)

__all__ = [
    "generate_telegram_link",
    "get_telegram_binding_status",
    "process_telegram_callback",
    "unlink_telegram_account",
]
