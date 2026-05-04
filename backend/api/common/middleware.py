import logging
import time

from django.core.cache import cache
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.utils import timezone
from django.utils.deprecation import MiddlewareMixin

from ..ban_service import BanService
from ..models import User
from .utils import get_current_user, is_request_authenticated

logger = logging.getLogger(__name__)


class DisableCSRFMiddleware(MiddlewareMixin):
    """
    Legacy middleware kept only for compatibility.
    It is no longer enabled in settings.
    """

    def process_request(self, request):
        if request.path.startswith('/api/'):
            setattr(request, '_dont_enforce_csrf_checks', True)


class UpdateLastLoginMiddleware:
    """
    Updates user's last_login on authenticated API activity,
    throttled through cache to avoid excess writes.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.MIN_UPDATE_INTERVAL = 300

    def __call__(self, request):
        if self._should_update_last_login(request):
            self._update_user_last_login(request)

        return self.get_response(request)

    def _should_update_last_login(self, request) -> bool:
        if not request.path.startswith('/api/'):
            return False

        if not is_request_authenticated(request):
            return False

        user = get_current_user(request)
        if user is None:
            return False

        cache_key = f'last_login_update_{user.student_code}'
        last_update = cache.get(cache_key, 0)
        return (time.time() - last_update) >= self.MIN_UPDATE_INTERVAL

    def _update_user_last_login(self, request):
        user = get_current_user(request)
        if user is None:
            return

        try:
            updated = User.objects.filter(pk=user.pk).update(
                last_login=timezone.now()
            )
            if updated > 0:
                cache_key = f'last_login_update_{user.student_code}'
                cache.set(cache_key, time.time(), self.MIN_UPDATE_INTERVAL)
        except Exception as exc:
            logger.warning("Error updating last_login for %s: %s", user.student_code, exc)


class EnforceActiveBanMiddleware:
    """Block authenticated API access for users with an active ban."""

    allowed_paths = {
        "/api/auth/check",
        "/api/ban/info",
        "/api/csrf",
        "/api/logout",
    }

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if self._is_blocked(request):
            user = get_current_user(request)
            ban_status = BanService.check_ban_status(user.student_code if user else None)
            return JsonResponse(
                {
                    "success": False,
                    "detail": "Аккаунт заблокирован",
                    "is_banned": True,
                    "ban_info": ban_status.get("ban_info"),
                },
                status=403,
            )

        return self.get_response(request)

    def _is_blocked(self, request) -> bool:
        if not request.path.startswith("/api/"):
            return False
        if request.path in self.allowed_paths:
            return False

        if not is_request_authenticated(request):
            return False

        user = get_current_user(request)
        if user is None:
            return False

        return BanService.check_ban_status(user.student_code)["is_banned"]
