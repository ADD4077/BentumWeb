import re
import time

from django.core.cache import cache

_UNSAFE_KEY_CHARS = re.compile(r"[^a-zA-Z0-9:._-]+")


def _safe_key_part(value: str) -> str:
    return _UNSAFE_KEY_CHARS.sub("_", value or "")[:160]


def consume_rate_limit(scope: str, identifier: str, limit: int, ttl_seconds: int) -> tuple[bool, int]:
    """
    Sliding-window-like throttle for lightweight abuse protection.

    Returns:
        (allowed, retry_after_seconds)
    """
    if limit <= 0 or ttl_seconds <= 0:
        return True, 0

    key = f"rate_limit:{_safe_key_part(scope)}:{_safe_key_part(identifier)}"
    now = time.time()
    state = cache.get(key)

    if not isinstance(state, dict):
        cache.set(
            key,
            {
                "count": 1,
                "expires_at": now + ttl_seconds,
            },
            timeout=ttl_seconds,
        )
        return True, 0

    expires_at = float(state.get("expires_at", now + ttl_seconds))
    if expires_at <= now:
        cache.set(
            key,
            {
                "count": 1,
                "expires_at": now + ttl_seconds,
            },
            timeout=ttl_seconds,
        )
        return True, 0

    count = int(state.get("count", 0))
    if count >= limit:
        retry_after = max(1, int(expires_at - now))
        return False, retry_after

    state["count"] = count + 1
    cache.set(key, state, timeout=max(1, int(expires_at - now)))
    return True, 0
