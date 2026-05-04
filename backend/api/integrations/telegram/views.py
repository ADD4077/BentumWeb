import json
import logging
from datetime import timedelta

from django.conf import settings
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from ...activity_service import log_activity_event
from ...common.decorators import allow_unverified_2fa
from ...common.rate_limits import consume_rate_limit
from ...common.utils import get_current_user, is_request_authenticated
from ...models import ActivityEvent
from ...telegram_binding_service import TelegramBindingService
from ...core.services import get_client_ip

telegram_binding_service = TelegramBindingService()
logger = logging.getLogger(__name__)
TELEGRAM_LINK_RATE_LIMIT = 5
TELEGRAM_LINK_RATE_TTL_SECONDS = 3600
TELEGRAM_UNLINK_RATE_LIMIT = 5
TELEGRAM_UNLINK_RATE_TTL_SECONDS = 3600


def _require_completed_2fa(request):
    if request.session.get("twofa_pending") and not request.session.get("twofa_verified", False):
        return JsonResponse(
            {
                "success": False,
                "detail": "РўСЂРµР±СѓРµС‚СЃСЏ Р·Р°РІРµСЂС€РёС‚СЊ РїСЂРѕРІРµСЂРєСѓ 2FA",
                "requires_2fa": True,
            },
            status=403,
        )
    return None


def _get_session_user(request):
    if not is_request_authenticated(request):
        return None, JsonResponse({"success": False, "detail": "РўСЂРµР±СѓРµС‚СЃСЏ Р°РІС‚РѕСЂРёР·Р°С†РёСЏ"}, status=401)

    user = get_current_user(request)
    if user is None:
        return None, JsonResponse({"success": False, "detail": "РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ РЅР°Р№РґРµРЅ"}, status=404)

    return user, None


def _internal_callback_authorized(request):
    configured_token = getattr(settings, "TELEGRAM_INTERNAL_API_TOKEN", "")
    provided_token = request.headers.get("X-Internal-Token", "")

    if configured_token:
        return provided_token == configured_token

    client_ip = (get_client_ip(request) or "").strip()
    return bool(getattr(settings, "DEBUG", False)) and client_ip in {"127.0.0.1", "::1", "localhost"}


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
            return JsonResponse({"success": False, "detail": "Telegram Р°РєРєР°СѓРЅС‚ СѓР¶Рµ РїСЂРёРІСЏР·Р°РЅ"}, status=400)

        allowed, retry_after = consume_rate_limit(
            "telegram-generate-link",
            user.student_code,
            TELEGRAM_LINK_RATE_LIMIT,
            TELEGRAM_LINK_RATE_TTL_SECONDS,
        )
        if not allowed:
            return JsonResponse(
                {
                    "success": False,
                    "detail": "Р РЋР В»Р С‘РЎв‚¬Р С”Р С•Р С Р СР Р…Р С•Р С–Р С• Р В·Р В°Р С—РЎР‚Р С•РЎРѓР С•Р Р† Р Р…Р В° Р С—РЎР‚Р С‘Р Р†РЎРЏР В·Р С”РЎС“ Telegram. Р СџР С•Р С—РЎР‚Р С•Р В±РЎС“Р в„–РЎвЂљР Вµ Р С—Р С•Р В·Р В¶Р Вµ.",
                    "retry_after": retry_after,
                },
                status=429,
            )

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
        return JsonResponse({"success": False, "detail": "Р’РЅСѓС‚СЂРµРЅРЅСЏСЏ РѕС€РёР±РєР° СЃРµСЂРІРµСЂР°"}, status=500)


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
        return JsonResponse({"success": False, "detail": "Р’РЅСѓС‚СЂРµРЅРЅСЏСЏ РѕС€РёР±РєР° СЃРµСЂРІРµСЂР°"}, status=500)


@require_http_methods(["POST"])
def unlink_telegram_account(request):
    try:
        user, error_response = _get_session_user(request)
        if error_response:
            return error_response

        twofa_gate_response = _require_completed_2fa(request)
        if twofa_gate_response:
            return twofa_gate_response

        allowed, retry_after = consume_rate_limit(
            "telegram-unlink",
            user.student_code,
            TELEGRAM_UNLINK_RATE_LIMIT,
            TELEGRAM_UNLINK_RATE_TTL_SECONDS,
        )
        if not allowed:
            return JsonResponse(
                {
                    "success": False,
                    "detail": "Р РЋР В»Р С‘РЎв‚¬Р С”Р С•Р С Р СР Р…Р С•Р С–Р С• Р В·Р В°Р С—РЎР‚Р С•РЎРѓР С•Р Р† Р Р…Р В° Р С•РЎвЂљР Р†РЎРЏР В·Р С”РЎС“ Telegram. Р СџР С•Р С—РЎР‚Р С•Р В±РЎС“Р в„–РЎвЂљР Вµ Р С—Р С•Р В·Р В¶Р Вµ.",
                    "retry_after": retry_after,
                },
                status=429,
            )

        ok, message = telegram_binding_service.unlink_telegram_account(user)
        if ok:
            log_activity_event(
                ActivityEvent.EVENT_TELEGRAM_UNLINKED,
                user=user,
                actor=user,
                details="Telegram Р°РєРєР°СѓРЅС‚ РѕС‚РІСЏР·Р°РЅ РїРѕР»СЊР·РѕРІР°С‚РµР»РµРј",
            )
            return JsonResponse({"success": True, "data": {"message": message}})
        return JsonResponse({"success": False, "detail": message}, status=400)
    except Exception:
        logger.exception("Failed to unlink Telegram account")
        return JsonResponse({"success": False, "detail": "Р’РЅСѓС‚СЂРµРЅРЅСЏСЏ РѕС€РёР±РєР° СЃРµСЂРІРµСЂР°"}, status=500)


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
            return JsonResponse({"success": False, "detail": "РўРѕРєРµРЅ РЅРµ РїСЂРµРґРѕСЃС‚Р°РІР»РµРЅ"}, status=400)
        if not isinstance(telegram_data, dict):
            return JsonResponse({"success": False, "detail": "Р”Р°РЅРЅС‹Рµ Telegram РЅРµ РїСЂРµРґРѕСЃС‚Р°РІР»РµРЅС‹"}, status=400)

        ok, message = telegram_binding_service.bind_telegram_account_sync(token, telegram_data)
        if ok:
            return JsonResponse({"success": True, "data": {"message": message}})
        return JsonResponse({"success": False, "detail": message}, status=400)
    except Exception:
        logger.exception("Failed to process Telegram callback")
        return JsonResponse({"success": False, "detail": "Р’РЅСѓС‚СЂРµРЅРЅСЏСЏ РѕС€РёР±РєР° СЃРµСЂРІРµСЂР°"}, status=500)
