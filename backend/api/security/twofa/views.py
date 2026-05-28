import logging

from django.conf import settings
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from rest_framework.views import APIView

from ...activity_service import log_activity_event
from ...common.decorators import allow_unverified_2fa, session_csrf_protect
from ...common.drf import SessionUserAPIView
from ...common.utils import get_user_settings
from ...core.services import AuthService, SessionService
from ...models import ActivityEvent, TelegramBinding
from ...notification_service import NotificationService
from ...telegram_binding_service import telegram_binding_service
from ...twofa_service import TwoFAService
from .serializers import TwoFAConfigSerializer, TwoFAVerifySerializer

twofa_service = TwoFAService()
logger = logging.getLogger(__name__)


class TwoFABaseView(SessionUserAPIView):
    def get_authenticated_user_or_error(self, request):
        return self.get_session_user(request)


@method_decorator(session_csrf_protect, name="dispatch")
class TwoFAConfigView(TwoFABaseView):
    def get(self, request):
        try:
            user, error_response = self.get_authenticated_user_or_error(request)
            if error_response:
                return error_response

            twofa_gate_response = self.require_completed_2fa(request)
            if twofa_gate_response:
                return twofa_gate_response

            binding = TelegramBinding.objects.filter(user=user, is_active=True).select_related("user").first()
            return self.success_response(
                data={
                    "enabled": bool(getattr(user, "twofa_enabled", False)),
                    "method": getattr(user, "twofa_method", None),
                    "telegram_linked": bool(binding and binding.telegram_id and binding.telegram_id != 0),
                }
            )
        except Exception:
            logger.exception("Failed to get 2FA config")
            return self.error_response("Внутренняя ошибка сервера", http_status=500)

    def post(self, request):
        try:
            user, error_response = self.get_authenticated_user_or_error(request)
            if error_response:
                return error_response

            twofa_gate_response = self.require_completed_2fa(request)
            if twofa_gate_response:
                return twofa_gate_response

            serializer = TwoFAConfigSerializer(data=request.data)
            if not serializer.is_valid():
                return self.error_response("Неверный формат JSON", http_status=400)

            binding = TelegramBinding.objects.filter(user=user, is_active=True).select_related("user").first()
            enabled = serializer.validated_data.get("enabled", False)
            method = serializer.validated_data.get("method")

            if enabled:
                if method != "telegram":
                    return self.error_response("Неподдерживаемый метод", http_status=400)

                if not binding or not binding.telegram_id or binding.telegram_id == 0:
                    return self.error_response("Telegram аккаунт не привязан", http_status=400)

                user.twofa_enabled = True
                user.twofa_method = "telegram"
                user.save(update_fields=["twofa_enabled", "twofa_method"])
                NotificationService.create(
                    user,
                    notification_type="twofa_enabled",
                    title="2FA включена",
                    body="Двухфакторная аутентификация через Telegram была включена для вашего аккаунта.",
                )
                log_activity_event(
                    ActivityEvent.EVENT_TWOFA_ENABLED,
                    user=user,
                    actor=user,
                    details="Пользователь включил 2FA через Telegram",
                )
                try:
                    if get_user_settings(user).notify_security_events:
                        telegram_binding_service.send_user_notification_sync(
                            user,
                            "Безопасность Bentum\n\nДвухфакторная аутентификация через Telegram была включена для вашего аккаунта.",
                        )
                except Exception:
                    logger.exception("Failed to send 2FA enabled notification for %s", user.student_code)
                return self.success_response(message="2FA включен с методом telegram")

            user.twofa_enabled = False
            user.twofa_method = None
            user.save(update_fields=["twofa_enabled", "twofa_method"])
            NotificationService.create(
                user,
                notification_type="twofa_disabled",
                title="2FA отключена",
                body="Двухфакторная аутентификация была отключена для вашего аккаунта.",
            )
            log_activity_event(
                ActivityEvent.EVENT_TWOFA_DISABLED,
                user=user,
                actor=user,
                details="Пользователь отключил 2FA",
            )
            try:
                if get_user_settings(user).notify_security_events:
                    telegram_binding_service.send_user_notification_sync(
                        user,
                        "Безопасность Bentum\n\nДвухфакторная аутентификация через Telegram была отключена для вашего аккаунта.",
                    )
            except Exception:
                logger.exception("Failed to send 2FA disabled notification for %s", user.student_code)
            return self.success_response(message="2FA отключен")
        except Exception:
            logger.exception("Failed to update 2FA config")
            return self.error_response("Внутренняя ошибка сервера", http_status=500)


@method_decorator(allow_unverified_2fa, name="dispatch")
@method_decorator(session_csrf_protect, name="dispatch")
class VerifyTwoFAView(TwoFABaseView):
    def post(self, request):
        try:
            if not request.session.get("twofa_pending"):
                return self.error_response("2FA не ожидается", http_status=400)

            user, error_response = self.get_authenticated_user_or_error(request)
            if error_response:
                return error_response

            student_code = user.student_code
            serializer = TwoFAVerifySerializer(data=request.data)
            if not serializer.is_valid():
                code = (serializer.initial_data or {}).get("code")
                if not code:
                    return self.error_response("Код обязателен", http_status=400)
                return self.error_response("Неверный формат кода", http_status=400)

            code = serializer.validated_data["code"]
            if not code.isdigit():
                return self.error_response("Неверный формат кода", http_status=400)

            lockout_seconds = twofa_service.get_verify_lockout_seconds(student_code, request)
            if lockout_seconds > 0:
                return self.error_response(
                    "Превышено количество попыток ввода 2FA-кода",
                    http_status=429,
                    retry_after=lockout_seconds,
                )

            if not twofa_service.verify_2fa_code(student_code, code, request):
                return self.error_response("Неверный код", http_status=400)

            request.session["twofa_pending"] = False
            request.session["twofa_verified"] = True
            SessionService.finalize_authenticated_session(request, user)
            SessionService.enforce_session_limits(user.student_code, request.session.session_key, request)
            AuthService.touch_last_login(user)
            NotificationService.create(
                user,
                notification_type="login_success",
                title="Новый вход в аккаунт",
                body="Вы успешно вошли в Bentum после подтверждения 2FA.",
            )

            try:
                if get_user_settings(user).notify_successful_login:
                    twofa_service.send_login_success_telegram_sync(user, request)
            except Exception:
                logger.exception("Failed to send successful login notification for %s", student_code)

            return self.success_response(message="Проверка 2FA успешна")
        except Exception:
            logger.exception("Failed to verify 2FA")
            return self.error_response("Внутренняя ошибка сервера", http_status=500)


@method_decorator(allow_unverified_2fa, name="dispatch")
@method_decorator(session_csrf_protect, name="dispatch")
class ResendTwoFACodeView(TwoFABaseView):
    def post(self, request):
        try:
            if not request.session.get("twofa_pending"):
                return self.error_response("2FA не ожидается", http_status=400)

            user, error_response = self.get_authenticated_user_or_error(request)
            if error_response:
                return error_response

            student_code = user.student_code
            if not twofa_service.is_2fa_required(user):
                return self.error_response("2FA не включен", http_status=400)

            resend_cooldown = twofa_service.get_resend_cooldown_seconds(student_code, request)
            if resend_cooldown > 0:
                return self.error_response(
                    "Повторная отправка временно недоступна",
                    http_status=429,
                    retry_after=resend_cooldown,
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
                return self.error_response("Неподдерживаемый метод 2FA", http_status=400)

            ok, message = twofa_service.send_2fa_code_telegram_sync(user, code)
            if not ok:
                return self.error_response(message, http_status=500)

            return self.success_response(message="Код 2FA успешно отправлен повторно")
        except Exception:
            logger.exception("Failed to resend 2FA code")
            return self.error_response("Внутренняя ошибка сервера", http_status=500)


get_2fa_config = TwoFAConfigView.as_view()
verify_2fa = VerifyTwoFAView.as_view()
resend_2fa_code = ResendTwoFACodeView.as_view()
