import logging
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status

from ...activity_service import log_activity_event
from ...common.decorators import allow_unverified_2fa
from ...common.drf import SessionUserAPIView
from ...common.rate_limits import consume_rate_limit
from ...core.services import get_client_ip
from ...models import ActivityEvent
from ...telegram_binding_service import TelegramBindingService
from .serializers import TelegramBindingStatusSerializer, TelegramCallbackSerializer

telegram_binding_service = TelegramBindingService()
logger = logging.getLogger(__name__)
TELEGRAM_LINK_RATE_LIMIT = 5
TELEGRAM_LINK_RATE_TTL_SECONDS = 3600
TELEGRAM_UNLINK_RATE_LIMIT = 5
TELEGRAM_UNLINK_RATE_TTL_SECONDS = 3600


def _internal_callback_authorized(request):
    configured_token = getattr(settings, "TELEGRAM_INTERNAL_API_TOKEN", "")
    provided_token = request.headers.get("X-Internal-Token", "")

    if configured_token:
        return provided_token == configured_token

    client_ip = (get_client_ip(request) or "").strip()
    return bool(getattr(settings, "DEBUG", False)) and client_ip in {"127.0.0.1", "::1", "localhost"}


class GenerateTelegramLinkView(SessionUserAPIView):
    def post(self, request):
        try:
            user, error_response = self.get_session_user(request)
            if error_response:
                return error_response

            twofa_gate_response = self.require_completed_2fa(request)
            if twofa_gate_response:
                return twofa_gate_response

            existing_binding = telegram_binding_service.get_user_binding(user)
            if existing_binding:
                return self.error_response("Telegram аккаунт уже привязан")

            allowed, retry_after = consume_rate_limit(
                "telegram-generate-link",
                user.student_code,
                TELEGRAM_LINK_RATE_LIMIT,
                TELEGRAM_LINK_RATE_TTL_SECONDS,
            )
            if not allowed:
                return self.error_response(
                    "Слишком много запросов на привязку Telegram. Попробуйте позже.",
                    http_status=status.HTTP_429_TOO_MANY_REQUESTS,
                    retry_after=retry_after,
                )

            token = telegram_binding_service.generate_binding_token(user)
            binding_link = telegram_binding_service.get_binding_link_sync(token)
            return self.success_response(
                data={
                    "binding_link": binding_link,
                    "expires_at": (timezone.now() + timedelta(hours=24)).isoformat(),
                }
            )
        except Exception:
            logger.exception("Failed to generate Telegram binding link")
            return self.error_response("Внутренняя ошибка сервера", http_status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TelegramBindingStatusView(SessionUserAPIView):
    def get(self, request):
        try:
            user, error_response = self.get_session_user(request)
            if error_response:
                return error_response

            twofa_gate_response = self.require_completed_2fa(request)
            if twofa_gate_response:
                return twofa_gate_response

            binding = telegram_binding_service.get_user_binding(user)
            payload = {"is_linked": False}
            if binding:
                payload = {
                    "is_linked": True,
                    "telegram_username": binding.telegram_username,
                    "telegram_first_name": binding.telegram_first_name,
                    "telegram_last_name": binding.telegram_last_name,
                    "linked_at": binding.created_at.isoformat(),
                }

            serializer = TelegramBindingStatusSerializer(payload)
            return self.success_response(data=serializer.data)
        except Exception:
            logger.exception("Failed to get Telegram binding status")
            return self.error_response("Внутренняя ошибка сервера", http_status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UnlinkTelegramAccountView(SessionUserAPIView):
    def post(self, request):
        try:
            user, error_response = self.get_session_user(request)
            if error_response:
                return error_response

            twofa_gate_response = self.require_completed_2fa(request)
            if twofa_gate_response:
                return twofa_gate_response

            allowed, retry_after = consume_rate_limit(
                "telegram-unlink",
                user.student_code,
                TELEGRAM_UNLINK_RATE_LIMIT,
                TELEGRAM_UNLINK_RATE_TTL_SECONDS,
            )
            if not allowed:
                return self.error_response(
                    "Слишком много запросов на отвязку Telegram. Попробуйте позже.",
                    http_status=status.HTTP_429_TOO_MANY_REQUESTS,
                    retry_after=retry_after,
                )

            ok, message = telegram_binding_service.unlink_telegram_account(user)
            if ok:
                log_activity_event(
                    ActivityEvent.EVENT_TELEGRAM_UNLINKED,
                    user=user,
                    actor=user,
                    details="Telegram аккаунт отвязан пользователем",
                )
                return self.success_response(data={"message": message})
            return self.error_response(message)
        except Exception:
            logger.exception("Failed to unlink Telegram account")
            return self.error_response("Внутренняя ошибка сервера", http_status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ProcessTelegramCallbackView(SessionUserAPIView):
    authentication_classes = []
    permission_classes = []

    @csrf_exempt
    @allow_unverified_2fa
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def post(self, request):
        try:
            if not _internal_callback_authorized(request):
                return self.error_response("Forbidden", http_status=status.HTTP_403_FORBIDDEN)

            serializer = TelegramCallbackSerializer(data=request.data or {})
            if not serializer.is_valid():
                errors = serializer.errors
                if "token" in errors:
                    return self.error_response("Токен не предоставлен")
                if "telegram" in errors:
                    return self.error_response("Данные Telegram не предоставлены")
                return self.error_response("Неверный формат данных")

            payload = serializer.validated_data
            ok, message = telegram_binding_service.bind_telegram_account_sync(payload["token"], payload["telegram"])
            if ok:
                return self.success_response(data={"message": message})
            return self.error_response(message)
        except Exception:
            logger.exception("Failed to process Telegram callback")
            return self.error_response("Внутренняя ошибка сервера", http_status=status.HTTP_500_INTERNAL_SERVER_ERROR)


generate_telegram_link = GenerateTelegramLinkView.as_view()
get_telegram_binding_status = TelegramBindingStatusView.as_view()
unlink_telegram_account = UnlinkTelegramAccountView.as_view()
process_telegram_callback = ProcessTelegramCallbackView.as_view()
