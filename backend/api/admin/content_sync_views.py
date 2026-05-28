import logging

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from ..background_jobs import BackgroundJobService
from ..common.permissions import can_access_admin_panel
from ..common.utils import get_current_user, is_request_authenticated
from ..models import User

logger = logging.getLogger(__name__)


def _get_current_user(request):
    request_user = getattr(request, "user", None)
    if isinstance(request_user, User) and getattr(request_user, "is_authenticated", False):
        request.session["student_code"] = request_user.student_code
        request.session["fullname"] = request_user.fullname
        request.session["faculty"] = request_user.faculty
        request.session["is_authenticated"] = True
        return request_user

    return get_current_user(request)


def _require_admin_user(request):
    if not is_request_authenticated(request):
        return None, JsonResponse({"success": False, "detail": "Authentication required"}, status=401)

    current_user = _get_current_user(request)
    if current_user is None:
        return None, JsonResponse({"success": False, "detail": "User not found"}, status=404)

    if not can_access_admin_panel(current_user):
        return None, JsonResponse({"success": False, "detail": "Admin access required"}, status=403)

    return current_user, None


@require_http_methods(["GET"])
def get_content_sync_status(request):
    _, error_response = _require_admin_user(request)
    if error_response:
        return error_response

    try:
        return JsonResponse(
            {
                "success": True,
                "content_sync": BackgroundJobService.get_content_sync_status(),
            }
        )
    except Exception:
        logger.exception("Failed to get content sync status")
        return JsonResponse({"success": False, "detail": "Internal server error"}, status=500)
