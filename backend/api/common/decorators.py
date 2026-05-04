"""
Централизованные декораторы для API представлений
"""
import logging
import traceback
from functools import wraps
from django.http import JsonResponse
from django.db import DatabaseError
from django.core.exceptions import ValidationError
from django.middleware.csrf import CsrfViewMiddleware

logger = logging.getLogger(__name__)


def api_error_handler(func):
    """
    Централизованный обработчик ошибок для API представлений
    Перехватывает исключения и возвращает согласованные ответы об ошибках
    """
    @wraps(func)
    def wrapper(request, *args, **kwargs):
        try:
            return func(request, *args, **kwargs)
        except ValidationError as e:
            logger.warning(f"Validation error in {func.__name__}: {str(e)}")
            return JsonResponse({
                'success': False,
                'detail': str(e)
            }, status=400)
        except DatabaseError as e:
            logger.error(f"Database error in {func.__name__}: {str(e)}")
            return JsonResponse({
                'success': False,
                'detail': 'Ошибка базы данных'
            }, status=500)
        except Exception as e:
            logger.error(f"Unexpected error in {func.__name__}: {str(e)}\n{traceback.format_exc()}")
            return JsonResponse({
                'success': False,
                'detail': 'Внутренняя ошибка сервера'
            }, status=500)
    return wrapper


def log_request(func):
    """
    Логировать входящие запросы для отладки и мониторинга
    """
    @wraps(func)
    def wrapper(request, *args, **kwargs):
        logger.info(f"{request.method} {request.path} - {request.META.get('REMOTE_ADDR')}")
        return func(request, *args, **kwargs)
    return wrapper


def allow_unverified_2fa(func):
    """
    Marks a view as accessible for authenticated sessions that have not yet
    completed 2FA verification.
    """
    setattr(func, "_allow_unverified_2fa", True)
    return func


def session_csrf_protect(view_func):
    """
    Enforce Django CSRF checks for DRF function views that use cookie sessions.

    DRF's `api_view` returns a csrf-exempt callable, which is appropriate for
    token auth but unsafe for this project because mutating endpoints authorize
    through Django's session cookie.
    """

    def wrapper(request, *args, **kwargs):
        rejection = CsrfViewMiddleware(lambda _request: None).process_view(
            request,
            None,
            args,
            kwargs,
        )
        if rejection is not None:
            return rejection
        return view_func(request, *args, **kwargs)

    wrapper.__name__ = getattr(view_func, "__name__", "session_csrf_protected_view")
    wrapper.__module__ = getattr(view_func, "__module__", __name__)
    wrapper.__doc__ = getattr(view_func, "__doc__", None)
    return wrapper
