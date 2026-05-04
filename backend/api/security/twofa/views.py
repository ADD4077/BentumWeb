import logging

from django.conf import settings
from django.http import JsonResponse
from rest_framework.decorators import api_view

from ...activity_service import log_activity_event
from ...common.decorators import allow_unverified_2fa, session_csrf_protect
from ...common.utils import get_current_user, get_user_settings, is_request_authenticated
from ...core.services import AuthService, SessionService
from ...models import ActivityEvent, TelegramBinding
from ...telegram_binding_service import telegram_binding_service
from ...twofa_service import TwoFAService

twofa_service = TwoFAService()
logger = logging.getLogger(__name__)


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


def _get_authenticated_user(request):
    if not is_request_authenticated(request):
        return None, JsonResponse({"success": False, "detail": "РќРµ Р°РІС‚РѕСЂРёР·РѕРІР°РЅ"}, status=401)

    user = get_current_user(request)
    if user is None:
        return None, JsonResponse({"success": False, "detail": "РЎРµСЃСЃРёСЏ РЅРµ РЅР°Р№РґРµРЅР°"}, status=401)

    return user, None


def _request_payload(request):
    return request.data if isinstance(request.data, dict) else {}


@session_csrf_protect
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
                return JsonResponse({"success": False, "detail": "РќРµРІРµСЂРЅС‹Р№ С„РѕСЂРјР°С‚ JSON"}, status=400)

            enabled = bool(data.get("enabled", False))
            method = data.get("method")

            if enabled:
                if method != "telegram":
                    return JsonResponse({"success": False, "detail": "РќРµРІРµСЂРЅС‹Р№ РјРµС‚РѕРґ"}, status=400)

                if not binding or not binding.telegram_id or binding.telegram_id == 0:
                    return JsonResponse({"success": False, "detail": "Telegram Р°РєРєР°СѓРЅС‚ РЅРµ РїСЂРёРІСЏР·Р°РЅ"}, status=400)

                user.twofa_enabled = True
                user.twofa_method = "telegram"
                user.save(update_fields=["twofa_enabled", "twofa_method"])
                log_activity_event(
                    ActivityEvent.EVENT_TWOFA_ENABLED,
                    user=user,
                    actor=user,
                    details="РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РІРєР»СЋС‡РёР» 2FA С‡РµСЂРµР· Telegram",
                )
                try:
                    if get_user_settings(user).notify_security_events:
                        telegram_binding_service.send_user_notification_sync(
                            user,
                            "Р‘РµР·РѕРїР°СЃРЅРѕСЃС‚СЊ Bentum\n\nР”РІСѓС…С„Р°РєС‚РѕСЂРЅР°СЏ Р°СѓС‚РµРЅС‚РёС„РёРєР°С†РёСЏ С‡РµСЂРµР· Telegram Р±С‹Р»Р° РІРєР»СЋС‡РµРЅР° РґР»СЏ РІР°С€РµРіРѕ Р°РєРєР°СѓРЅС‚Р°.",
                        )
                except Exception:
                    logger.exception("Failed to send 2FA enabled notification for %s", user.student_code)
                return JsonResponse({"success": True, "message": "2FA РІРєР»СЋС‡РµРЅ СЃ РјРµС‚РѕРґРѕРј telegram"})

            user.twofa_enabled = False
            user.twofa_method = None
            user.save(update_fields=["twofa_enabled", "twofa_method"])
            log_activity_event(
                ActivityEvent.EVENT_TWOFA_DISABLED,
                user=user,
                actor=user,
                details="РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РѕС‚РєР»СЋС‡РёР» 2FA",
            )
            try:
                if get_user_settings(user).notify_security_events:
                    telegram_binding_service.send_user_notification_sync(
                        user,
                        "Р‘РµР·РѕРїР°СЃРЅРѕСЃС‚СЊ Bentum\n\nР”РІСѓС…С„Р°РєС‚РѕСЂРЅР°СЏ Р°СѓС‚РµРЅС‚РёС„РёРєР°С†РёСЏ РґР»СЏ РІР°С€РµРіРѕ Р°РєРєР°СѓРЅС‚Р° Р±С‹Р»Р° РѕС‚РєР»СЋС‡РµРЅР°.",
                    )
            except Exception:
                logger.exception("Failed to send 2FA disabled notification for %s", user.student_code)
            return JsonResponse({"success": True, "message": "2FA РѕС‚РєР»СЋС‡РµРЅ"})

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
        return JsonResponse({"success": False, "detail": "Р’РЅСѓС‚СЂРµРЅРЅСЏСЏ РѕС€РёР±РєР° СЃРµСЂРІРµСЂР°"}, status=500)


@allow_unverified_2fa
@session_csrf_protect
@api_view(["POST"])
def verify_2fa(request):
    try:
        if not is_request_authenticated(request):
            return JsonResponse({"success": False, "detail": "РќРµ Р°РІС‚РѕСЂРёР·РѕРІР°РЅ"}, status=401)

        if not request.session.get("twofa_pending"):
            return JsonResponse({"success": False, "detail": "2FA РЅРµ РѕР¶РёРґР°РµС‚СЃСЏ"}, status=400)

        user = get_current_user(request)
        if user is None:
            return JsonResponse({"success": False, "detail": "РЎРµСЃСЃРёСЏ РЅРµ РЅР°Р№РґРµРЅР°"}, status=401)

        student_code = user.student_code
        data = _request_payload(request)
        if not data:
            return JsonResponse({"success": False, "detail": "Invalid JSON"}, status=400)

        code = data.get("code")
        if not code:
            return JsonResponse({"success": False, "detail": "РљРѕРґ РѕР±СЏР·Р°С‚РµР»РµРЅ"}, status=400)

        if len(code) != 6 or not code.isdigit():
            return JsonResponse({"success": False, "detail": "РќРµРІРµСЂРЅС‹Р№ С„РѕСЂРјР°С‚ РєРѕРґР°"}, status=400)

        lockout_seconds = twofa_service.get_verify_lockout_seconds(student_code, request)
        if lockout_seconds > 0:
            return JsonResponse(
                {
                    "success": False,
                    "detail": "РџСЂРµРІС‹С€РµРЅРѕ РєРѕР»РёС‡РµСЃС‚РІРѕ РїРѕРїС‹С‚РѕРє РІРІРѕРґР° 2FA-РєРѕРґР°",
                    "retry_after": lockout_seconds,
                },
                status=429,
            )

        if not twofa_service.verify_2fa_code(student_code, code, request):
            return JsonResponse({"success": False, "detail": "РќРµРІРµСЂРЅС‹Р№ РєРѕРґ"}, status=400)

        request.session["twofa_pending"] = False
        request.session["twofa_verified"] = True
        SessionService.finalize_authenticated_session(request, user)
        SessionService.enforce_session_limits(user.student_code, request.session.session_key, request)
        AuthService.touch_last_login(user)

        try:
            if get_user_settings(user).notify_successful_login:
                twofa_service.send_login_success_telegram_sync(user, request)
        except Exception:
            logger.exception("Failed to send successful login notification for %s", student_code)

        return JsonResponse({"success": True, "message": "РџСЂРѕРІРµСЂРєР° 2FA СѓСЃРїРµС€РЅР°"})
    except Exception:
        logger.exception("Failed to verify 2FA")
        return JsonResponse({"success": False, "detail": "Р’РЅСѓС‚СЂРµРЅРЅСЏСЏ РѕС€РёР±РєР° СЃРµСЂРІРµСЂР°"}, status=500)


@allow_unverified_2fa
@session_csrf_protect
@api_view(["POST"])
def resend_2fa_code(request):
    try:
        if not is_request_authenticated(request):
            return JsonResponse({"success": False, "detail": "РќРµ Р°РІС‚РѕСЂРёР·РѕРІР°РЅ"}, status=401)

        if not request.session.get("twofa_pending"):
            return JsonResponse({"success": False, "detail": "2FA РЅРµ РѕР¶РёРґР°РµС‚СЃСЏ"}, status=400)

        user = get_current_user(request)
        if user is None:
            return JsonResponse({"success": False, "detail": "РЎРµСЃСЃРёСЏ РЅРµ РЅР°Р№РґРµРЅР°"}, status=401)

        student_code = user.student_code
        if not twofa_service.is_2fa_required(user):
            return JsonResponse({"success": False, "detail": "2FA РЅРµ РІРєР»СЋС‡РµРЅ"}, status=400)

        resend_cooldown = twofa_service.get_resend_cooldown_seconds(student_code, request)
        if resend_cooldown > 0:
            return JsonResponse(
                {
                    "success": False,
                    "detail": "РџРѕРІС‚РѕСЂРЅР°СЏ РѕС‚РїСЂР°РІРєР° РІСЂРµРјРµРЅРЅРѕ РЅРµРґРѕСЃС‚СѓРїРЅР°",
                    "retry_after": resend_cooldown,
                },
                status=429,
            )

        existing_code, remaining_time = twofa_service.get_existing_code(student_code)
        if existing_code and remaining_time > settings.TWOFA_RESEND_COOLDOWN_SECONDS:
            return JsonResponse(
                {
                    "success": False,
                    "detail": f"РљРѕРґ РµС‰Рµ РґРµР№СЃС‚РІРёС‚РµР»РµРЅ. РћСЃС‚Р°Р»РѕСЃСЊ {remaining_time} СЃРµРєСѓРЅРґ.",
                    "remaining_time": remaining_time,
                },
                status=429,
            )

        code = twofa_service.generate_6fa_code()
        twofa_service.store_2fa_code(student_code, code, request)
        twofa_service.register_resend(student_code, request)

        if user.twofa_method != "telegram":
            return JsonResponse({"success": False, "detail": "РќРµРїРѕРґРґРµСЂР¶РёРІР°РµРјС‹Р№ РјРµС‚РѕРґ 2FA"}, status=400)

        ok, message = twofa_service.send_2fa_code_telegram_sync(user, code)
        if not ok:
            return JsonResponse({"success": False, "detail": message}, status=500)

        return JsonResponse({"success": True, "message": "РљРѕРґ 2FA СѓСЃРїРµС€РЅРѕ РѕС‚РїСЂР°РІР»РµРЅ РїРѕРІС‚РѕСЂРЅРѕ"})
    except Exception:
        logger.exception("Failed to resend 2FA code")
        return JsonResponse({"success": False, "detail": "Р’РЅСѓС‚СЂРµРЅРЅСЏСЏ РѕС€РёР±РєР° СЃРµСЂРІРµСЂР°"}, status=500)
