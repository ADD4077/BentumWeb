import logging
import time

from django.core.cache import cache
from django.middleware.csrf import get_token
from django.utils import timezone
from django.utils.deprecation import MiddlewareMixin

from ..models import User

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

        session = getattr(request, 'session', None)
        if not session or not session.get('is_authenticated'):
            return False

        student_code = session.get('student_code')
        if not student_code:
            return False

        cache_key = f'last_login_update_{student_code}'
        last_update = cache.get(cache_key, 0)
        return (time.time() - last_update) >= self.MIN_UPDATE_INTERVAL

    def _update_user_last_login(self, request):
        student_code = request.session.get('student_code')
        if not student_code:
            return

        try:
            updated = User.objects.filter(student_code=student_code).update(
                last_login=int(timezone.now().timestamp())
            )
            if updated > 0:
                cache_key = f'last_login_update_{student_code}'
                cache.set(cache_key, time.time(), self.MIN_UPDATE_INTERVAL)
        except Exception as exc:
            logger.warning("Error updating last_login for %s: %s", student_code, exc)
