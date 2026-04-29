import json
import logging
from datetime import timedelta

from django.conf import settings
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from ...common.decorators import allow_unverified_2fa
from ...models import User
from ...telegram_binding_service import TelegramBindingService

telegram_binding_service = TelegramBindingService()
logger = logging.getLogger(__name__)


def _require_completed_2fa(request):
    if request.session.get("twofa_pending") and not request.session.get("twofa_verified", False):
        return JsonResponse(
            {
                "success": False,
                "detail": "Требуется завершить проверку 2FA",
                "requires_2fa": True,
            },
            status=403,
        )
    return None


def _get_session_user(request):
    if not request.session.get("is_authenticated"):
        return None, JsonResponse({"success": False, "detail": "Требуется авторизация"}, status=401)

    student_code = request.session.get("student_code")
    if not student_code:
        return None, JsonResponse({"success": False, "detail": "Код студента не найден в сессии"}, status=401)

    user = User.objects.filter(student_code=student_code).first()
    if not user:
        return None, JsonResponse({"success": False, "detail": "Пользователь не найден"}, status=404)

    return user, None


def _internal_callback_authorized(request):
    configured_token = getattr(settings, "TELEGRAM_INTERNAL_API_TOKEN", "")
    provided_token = request.headers.get("X-Internal-Token", "")

    if configured_token:
        return provided_token == configured_token

    return bool(getattr(settings, "DEBUG", False))


@require_http_methods(["POST"])
def generate_telegram_link(request):
    try:
        user, error_response = _get_session_user(request)
        if error_response:
            return error_response

        twofa_gate_response = _require_completed_2fa(request)
        if twofa_gate_response:
            return twofa_gate_response

        existing_binding = telegram_binding_service.get_user_binding(user)
        if existing_binding:
            return JsonResponse({"success": False, "detail": "Telegram аккаунт уже привязан"}, status=400)

        token = telegram_binding_service.generate_binding_token(user)
        binding_link = telegram_binding_service.get_binding_link_sync(token)
        return JsonResponse(
            {
                "success": True,
                "data": {
                    "binding_link": binding_link,
                    "expires_at": (timezone.now() + timedelta(hours=24)).isoformat(),
                },
            }
        )
    except Exception:
        logger.exception("Failed to generate Telegram binding link")
        return JsonResponse({"success": False, "detail": "Внутренняя ошибка сервера"}, status=500)


@require_http_methods(["GET"])
def get_telegram_binding_status(request):
    try:
        user, error_response = _get_session_user(request)
        if error_response:
            return error_response

        twofa_gate_response = _require_completed_2fa(request)
        if twofa_gate_response:
            return twofa_gate_response

        binding = telegram_binding_service.get_user_binding(user)
        if not binding:
            return JsonResponse({"success": True, "data": {"is_linked": False}})

        return JsonResponse(
            {
                "success": True,
                "data": {
                    "is_linked": True,
                    "telegram_username": binding.telegram_username,
                    "telegram_first_name": binding.telegram_first_name,
                    "telegram_last_name": binding.telegram_last_name,
                    "linked_at": binding.created_at.isoformat(),
                },
            }
        )
    except Exception:
        logger.exception("Failed to get Telegram binding status")
        return JsonResponse({"success": False, "detail": "Внутренняя ошибка сервера"}, status=500)


@require_http_methods(["POST"])
def unlink_telegram_account(request):
    try:
        user, error_response = _get_session_user(request)
        if error_response:
            return error_response

        twofa_gate_response = _require_completed_2fa(request)
        if twofa_gate_response:
            return twofa_gate_response

        ok, message = telegram_binding_service.unlink_telegram_account(user)
        if ok:
            return JsonResponse({"success": True, "data": {"message": message}})
        return JsonResponse({"success": False, "detail": message}, status=400)
    except Exception:
        logger.exception("Failed to unlink Telegram account")
        return JsonResponse({"success": False, "detail": "Внутренняя ошибка сервера"}, status=500)


@allow_unverified_2fa
@csrf_exempt
@require_http_methods(["POST"])
def process_telegram_callback(request):
    try:
        if not _internal_callback_authorized(request):
            return JsonResponse({"success": False, "detail": "Forbidden"}, status=403)

        try:
            payload = json.loads(request.body.decode("utf-8") or "{}")
        except Exception:
            payload = {}

        token = payload.get("token")
        telegram_data = payload.get("telegram")

        if not token:
            return JsonResponse({"success": False, "detail": "Токен не предоставлен"}, status=400)
        if not isinstance(telegram_data, dict):
            return JsonResponse({"success": False, "detail": "Данные Telegram не предоставлены"}, status=400)

        ok, message = telegram_binding_service.bind_telegram_account_sync(token, telegram_data)
        if ok:
            return JsonResponse({"success": True, "data": {"message": message}})
        return JsonResponse({"success": False, "detail": message}, status=400)
    except Exception:
        logger.exception("Failed to process Telegram callback")
        return JsonResponse({"success": False, "detail": "Внутренняя ошибка сервера"}, status=500)
