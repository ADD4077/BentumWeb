"""
Общие/служебные представления.
"""

import logging

from django.db import connection
from django.utils import timezone
from rest_framework.decorators import api_view

from .common.decorators import allow_unverified_2fa
from .common.responses import error_response, success_response

logger = logging.getLogger(__name__)


@allow_unverified_2fa
@api_view(["GET", "POST", "HEAD"])
def health_check(request):
    """Endpoint проверки работоспособности."""
    try:
        connection.ensure_connection()
        return success_response(
            status="healthy",
            timestamp=timezone.now().isoformat(),
            database="connected",
        )
    except Exception:
        logger.warning("Health check failed")
        return error_response(
            "Service unavailable",
            http_status=500,
            status="unhealthy",
            timestamp=timezone.now().isoformat(),
        )
