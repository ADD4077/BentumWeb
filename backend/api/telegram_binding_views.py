import json
import logging
from datetime import timedelta

from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import User
from .telegram_binding_service import TelegramBindingService

telegram_binding_service = TelegramBindingService()
logger = logging.getLogger(__name__)


def _get_session_user(request):
    if not request.session.get("is_authenticated"):
        return None, JsonResponse({"success": False, "detail": "Authorization required"}, status=401)

    student_code = request.session.get("student_code")
    if not student_code:
        return None, JsonResponse({"success": False, "detail": "Student code not found in session"}, status=401)

    user = User.objects.filter(student_code=student_code).first()
    if not user:
        return None, JsonResponse({"success": False, "detail": "User not found"}, status=404)

    return user, None


@csrf_exempt
@require_http_methods(["POST"])
def generate_telegram_link(request):
    """Сгенерировать ссылку для привязки Telegram."""
    try:
        user, error_response = _get_session_user(request)
        if error_response:
            return error_response

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
    except Exception as error:
        logger.exception("Error generating Telegram link: %s", error)
        return JsonResponse({"success": False, "detail": "Внутренняя ошибка сервера"}, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def get_telegram_binding_status(request):
    """Получить статус привязки Telegram."""
    try:
        user, error_response = _get_session_user(request)
        if error_response:
            return error_response

        binding = telegram_binding_service.get_user_binding(user)
        if binding:
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

        return JsonResponse({"success": True, "data": {"is_linked": False}})
    except Exception as error:
        logger.exception("Error getting Telegram binding status: %s", error)
        return JsonResponse({"success": False, "detail": "Внутренняя ошибка сервера"}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def unlink_telegram_account(request):
    """Отвязать Telegram аккаунт."""
    try:
        user, error_response = _get_session_user(request)
        if error_response:
            return error_response

        ok, message = telegram_binding_service.unlink_telegram_account(user)
        if ok:
            return JsonResponse({"success": True, "data": {"message": message}})

        return JsonResponse({"success": False, "detail": message}, status=400)
    except Exception as error:
        logger.exception("Error unlinking Telegram account: %s", error)
        return JsonResponse({"success": False, "detail": "Внутренняя ошибка сервера"}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def process_telegram_callback(request):
    """Привязать Telegram аккаунт по токену."""
    try:
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
    except Exception as error:
        logger.exception("Error processing Telegram callback: %s", error)
        return JsonResponse({"success": False, "detail": "Внутренняя ошибка сервера"}, status=500)
