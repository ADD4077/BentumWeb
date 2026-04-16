"""
Централизованные декораторы для API представлений
"""
import logging
import traceback
from functools import wraps
from django.http import JsonResponse
from django.db import DatabaseError
from django.core.exceptions import ValidationError

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
