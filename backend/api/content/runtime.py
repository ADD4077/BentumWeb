import os

import requests
from django.conf import settings
from tenacity import AsyncRetrying, Retrying, retry_if_exception_type, stop_after_attempt, wait_exponential

from .constants import DEFAULT_HEADERS


def allow_insecure_ssl_fallback() -> bool:
    explicit_value = os.environ.get("BNTU_ALLOW_INSECURE_SSL")
    if explicit_value is not None:
        return explicit_value.lower() in {"1", "true", "yes", "on"}
    return bool(getattr(settings, "DEBUG", False))


def build_async_retry_policy(attempts, delay, retry_types):
    return AsyncRetrying(
        stop=stop_after_attempt(attempts),
        wait=wait_exponential(multiplier=delay, min=delay, max=max(delay, delay * 4)),
        retry=retry_if_exception_type(retry_types),
        reraise=True,
    )


def build_sync_retry_policy(attempts, delay, retry_types):
    return Retrying(
        stop=stop_after_attempt(attempts),
        wait=wait_exponential(multiplier=delay, min=delay, max=max(delay, delay * 4)),
        retry=retry_if_exception_type(retry_types),
        reraise=True,
    )


def safe_get(url, *, headers=None, timeout=10, retries=3, delay=0.35, **kwargs):
    request_headers = headers or DEFAULT_HEADERS

    def fetch():
        return requests.get(url, timeout=timeout, headers=request_headers, **kwargs)

    try:
        for attempt in build_sync_retry_policy(retries, delay, (requests.RequestException,)):
            with attempt:
                return fetch()
    except requests.RequestException:
        return None
    return None
