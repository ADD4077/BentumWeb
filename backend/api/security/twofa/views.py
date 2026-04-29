import logging

from django.conf import settings
from django.http import JsonResponse
from rest_framework.decorators import api_view

from ...common.decorators import allow_unverified_2fa
from ...common.utils import get_user_settings
from ...models import TelegramBinding, User
from ...twofa_service import TwoFAService

twofa_service = TwoFAService()
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


def _get_authenticated_user(request):
    if not request.session.get("is_authenticated"):
        return None, JsonResponse({"success": False, "detail": "Не авторизован"}, status=401)

    student_code = request.session.get("student_code")
    if not student_code:
        return None, JsonResponse({"success": False, "detail": "Сессия не найдена"}, status=401)

    user = User.objects.filter(student_code=student_code).first()
    if not user:
        return None, JsonResponse({"success": False, "detail": "Пользователь не найден"}, status=404)

    return user, None


def _request_payload(request):
    return request.data if isinstance(request.data, dict) else {}


@api_view(["GET", "POST"])
def get_2fa_config(request):
    try:
        user, error_response = _get_authenticated_user(request)
        if error_response:
            return error_response

        twofa_gate_response = _require_completed_2fa(request)
        if twofa_gate_response:
            return twofa_gate_response

        binding = TelegramBinding.objects.filter(user=user, is_active=True).select_related("user").first()

        if request.method == "POST":
            data = _request_payload(request)
            if not data:
                return JsonResponse({"success": False, "detail": "Неверный формат JSON"}, status=400)

            enabled = bool(data.get("enabled", False))
            method = data.get("method")

            if enabled:
                if method != "telegram":
                    return JsonResponse({"success": False, "detail": "Неверный метод"}, status=400)

                if not binding or not binding.telegram_id or binding.telegram_id == 0:
                    return JsonResponse({"success": False, "detail": "Telegram аккаунт не привязан"}, status=400)

                user.twofa_enabled = True
                user.twofa_method = "telegram"
                user.save(update_fields=["twofa_enabled", "twofa_method"])
                return JsonResponse({"success": True, "message": "2FA включен с методом telegram"})

            user.twofa_enabled = False
            user.twofa_method = None
            user.save(update_fields=["twofa_enabled", "twofa_method"])
            return JsonResponse({"success": True, "message": "2FA отключен"})

        return JsonResponse(
            {
                "success": True,
                "data": {
                    "enabled": bool(getattr(user, "twofa_enabled", False)),
                    "method": getattr(user, "twofa_method", None),
                    "telegram_linked": bool(binding and binding.telegram_id and binding.telegram_id != 0),
                },
            }
        )
    except Exception:
        logger.exception("Failed to get or update 2FA config")
        return JsonResponse({"success": False, "detail": "Внутренняя ошибка сервера"}, status=500)


@allow_unverified_2fa
@api_view(["POST"])
def verify_2fa(request):
    try:
        if not request.session.get("is_authenticated"):
            return JsonResponse({"success": False, "detail": "Не авторизован"}, status=401)

        if not request.session.get("twofa_pending"):
            return JsonResponse({"success": False, "detail": "2FA не ожидается"}, status=400)

        student_code = request.session.get("student_code")
        if not student_code:
            return JsonResponse({"success": False, "detail": "Сессия не найдена"}, status=401)

        data = _request_payload(request)
        if not data:
            return JsonResponse({"success": False, "detail": "Invalid JSON"}, status=400)

        code = data.get("code")
        if not code:
            return JsonResponse({"success": False, "detail": "Код обязателен"}, status=400)

        if len(code) != 6 or not code.isdigit():
            return JsonResponse({"success": False, "detail": "Неверный формат кода"}, status=400)

        lockout_seconds = twofa_service.get_verify_lockout_seconds(student_code, request)
        if lockout_seconds > 0:
            return JsonResponse(
                {
                    "success": False,
                    "detail": "Превышено количество попыток ввода 2FA-кода",
                    "retry_after": lockout_seconds,
                },
                status=429,
            )

        if not twofa_service.verify_2fa_code(student_code, code, request):
            return JsonResponse({"success": False, "detail": "Неверный код"}, status=400)

        request.session["twofa_pending"] = False
        request.session["twofa_verified"] = True
        request.session.save()

        try:
            user = User.objects.filter(student_code=student_code).first()
            if user and get_user_settings(user).notify_successful_login:
                twofa_service.send_login_success_telegram_sync(user, request)
        except Exception:
            logger.exception("Failed to send successful login notification for %s", student_code)

        return JsonResponse({"success": True, "message": "Проверка 2FA успешна"})
    except Exception:
        logger.exception("Failed to verify 2FA")
        return JsonResponse({"success": False, "detail": "Внутренняя ошибка сервера"}, status=500)


@allow_unverified_2fa
@api_view(["POST"])
def resend_2fa_code(request):
    try:
        if not request.session.get("is_authenticated"):
            return JsonResponse({"success": False, "detail": "Не авторизован"}, status=401)

        if not request.session.get("twofa_pending"):
            return JsonResponse({"success": False, "detail": "2FA не ожидается"}, status=400)

        student_code = request.session.get("student_code")
        if not student_code:
            return JsonResponse({"success": False, "detail": "Сессия не найдена"}, status=401)

        user = User.objects.filter(student_code=student_code).first()
        if not user:
            return JsonResponse({"success": False, "detail": "Пользователь не найден"}, status=404)

        if not twofa_service.is_2fa_required(user):
            return JsonResponse({"success": False, "detail": "2FA не включен"}, status=400)

        resend_cooldown = twofa_service.get_resend_cooldown_seconds(student_code, request)
        if resend_cooldown > 0:
            return JsonResponse(
                {
                    "success": False,
                    "detail": "Повторная отправка временно недоступна",
                    "retry_after": resend_cooldown,
                },
                status=429,
            )

        existing_code, remaining_time = twofa_service.get_existing_code(student_code)
        if existing_code and remaining_time > settings.TWOFA_RESEND_COOLDOWN_SECONDS:
            return JsonResponse(
                {
                    "success": False,
                    "detail": f"Код еще действителен. Осталось {remaining_time} секунд.",
                    "remaining_time": remaining_time,
                },
                status=429,
            )

        code = twofa_service.generate_6fa_code()
        twofa_service.store_2fa_code(student_code, code, request)
        twofa_service.register_resend(student_code, request)

        if user.twofa_method != "telegram":
            return JsonResponse({"success": False, "detail": "Неподдерживаемый метод 2FA"}, status=400)

        ok, message = twofa_service.send_2fa_code_telegram_sync(user, code)
        if not ok:
            return JsonResponse({"success": False, "detail": message}, status=500)

        return JsonResponse({"success": True, "message": "Код 2FA успешно отправлен повторно"})
    except Exception:
        logger.exception("Failed to resend 2FA code")
        return JsonResponse({"success": False, "detail": "Внутренняя ошибка сервера"}, status=500)
