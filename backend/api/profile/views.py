import json
import logging

from django.contrib.auth.hashers import make_password
from django.views.decorators.http import require_http_methods

from ..common.responses import (
    auth_required_response,
    error_response,
    not_found_response,
    success_response,
)
from ..common.utils import (
    get_current_user,
    get_user_media,
    get_user_settings,
    is_request_authenticated,
    serialize_datetime,
    serialize_user_preferences,
)
from ..core.services import AuthService
from ..telegram_binding_service import telegram_binding_service

logger = logging.getLogger(__name__)

PREFERENCE_FIELD_ALIASES = {
    "notify_successful_login": "notify_successful_login",
    "notifySupportReplies": "notify_support_replies",
    "notify_support_replies": "notify_support_replies",
    "notifySecurityEvents": "notify_security_events",
    "notify_security_events": "notify_security_events",
    "showProfileInCommunity": "show_profile_in_community",
    "show_profile_in_community": "show_profile_in_community",
    "showFaculty": "show_faculty",
    "show_faculty": "show_faculty",
    "allowTelegramDiscovery": "allow_telegram_discovery",
    "allow_telegram_discovery": "allow_telegram_discovery",
}


def _auth_error():
    return auth_required_response()


def _user_not_found_error():
    return not_found_response("Пользователь не найден")


def _build_user_payload(user):
    media = get_user_media(user)
    user_settings = get_user_settings(user)
    preferences = serialize_user_preferences(user_settings)
    return {
        "fullname": user.fullname,
        "faculty": user.faculty,
        "student_code": user.student_code,
        "role": user.role,
        "twofa_enabled": user.twofa_enabled,
        "twofa_method": user.twofa_method,
        **preferences,
        "preferences": preferences,
        "created_at": serialize_datetime(user.created_at),
        "last_login": serialize_datetime(user.last_login),
        **media,
    }


@require_http_methods(["POST", "GET"])
def update_profile(request):
    try:
        if not is_request_authenticated(request):
            return _auth_error()

        user = get_current_user(request)
        if not user:
            return _user_not_found_error()

        user_payload = _build_user_payload(user)

        if request.method == "GET":
            return success_response(user=user_payload)

        return success_response(
            message="Профиль успешно обновлён",
            user=user_payload,
        )
    except Exception:
        logger.exception("Failed to load profile data")
        return error_response("Внутренняя ошибка сервера", http_status=500)


@require_http_methods(["POST"])
def update_preferences(request):
    try:
        if not is_request_authenticated(request):
            return _auth_error()

        user = get_current_user(request)
        if not user:
            return _user_not_found_error()

        user_settings = get_user_settings(user)
        data = json.loads(request.body or "{}")
        updates = {}

        for incoming_key, model_field in PREFERENCE_FIELD_ALIASES.items():
            if incoming_key in data:
                updates[model_field] = bool(data.get(incoming_key))

        if not updates:
            return error_response("Не указаны настройки для обновления", http_status=400)

        for field_name, value in updates.items():
            setattr(user_settings, field_name, value)

        user_settings.save(update_fields=[*sorted(updates.keys()), "updated_at"])

        return success_response(
            message="Настройки сохранены",
            preferences=serialize_user_preferences(user_settings),
        )
    except json.JSONDecodeError:
        return error_response("Неверный формат данных", http_status=400)
    except Exception:
        logger.exception("Failed to update profile preferences")
        return error_response("Внутренняя ошибка сервера", http_status=500)


@require_http_methods(["POST"])
def update_avatar(request):
    try:
        if not is_request_authenticated(request):
            return _auth_error()

        user = get_current_user(request)
        if not user:
            return _user_not_found_error()

        from ..media_service import MediaStorage

        return success_response(
            message="Аватар успешно обновлён",
            avatar_url=None,
            avatar_placeholder=MediaStorage.get_placeholder_data(user, "avatar"),
        )
    except Exception:
        logger.exception("Failed to update avatar placeholder response")
        return error_response("Внутренняя ошибка сервера", http_status=500)


@require_http_methods(["POST"])
def update_banner(request):
    try:
        if not is_request_authenticated(request):
            return _auth_error()

        user = get_current_user(request)
        if not user:
            return _user_not_found_error()

        from ..media_service import MediaStorage

        return success_response(
            message="Баннер успешно обновлён",
            banner_url=None,
            banner_placeholder=MediaStorage.get_placeholder_data(user, "banner"),
        )
    except Exception:
        logger.exception("Failed to update banner placeholder response")
        return error_response("Внутренняя ошибка сервера", http_status=500)


@require_http_methods(["POST"])
def change_password(request):
    try:
        if not is_request_authenticated(request):
            return _auth_error()

        user = get_current_user(request)
        if not user:
            return _user_not_found_error()

        data = json.loads(request.body or "{}")
        current_password = data.get("current_password")
        new_password = data.get("new_password")
        confirm_password = data.get("confirm_password")

        if not current_password or not new_password or not confirm_password:
            return error_response("Все поля обязательны для заполнения", http_status=400)

        if new_password != confirm_password:
            return error_response("Новые пароли не совпадают", http_status=400)

        if len(new_password) < 7:
            return error_response("Пароль должен содержать минимум 7 символов", http_status=400)

        if not AuthService.verify_user_password(user, current_password):
            return error_response("Текущий пароль указан неверно", http_status=400)

        user.password = make_password(new_password)
        user.save(update_fields=["password"])

        try:
            if get_user_settings(user).notify_security_events:
                telegram_binding_service.send_user_notification_sync(
                    user,
                    (
                        "Безопасность Bentum\n\n"
                        "Пароль вашего аккаунта был изменён. Если это были не вы, "
                        "срочно смените пароль и проверьте безопасность аккаунта."
                    ),
                )
        except Exception:
            logger.exception(
                "Failed to send password change notification for %s",
                user.student_code,
            )

        return success_response(message="Пароль успешно изменён")
    except json.JSONDecodeError:
        return error_response("Неверный формат данных", http_status=400)
    except Exception:
        logger.exception("Failed to change password")
        return error_response("Внутренняя ошибка сервера", http_status=500)
