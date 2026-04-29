import json
import logging

from django.contrib.auth.hashers import make_password
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from ..common.utils import get_current_user, get_user_media, get_user_settings, serialize_datetime
from ..core.services import AuthService

logger = logging.getLogger(__name__)


def _auth_error():
    return JsonResponse({"success": False, "detail": "Требуется авторизация"}, status=401)


def _user_not_found_error():
    return JsonResponse({"success": False, "detail": "Пользователь не найден"}, status=404)


@require_http_methods(["POST", "GET"])
def update_profile(request):
    try:
        if not request.session.get("is_authenticated"):
            return _auth_error()

        user = get_current_user(request)
        if not user:
            return _user_not_found_error()

        media = get_user_media(user)
        user_settings = get_user_settings(user)
        user_payload = {
            "fullname": user.fullname,
            "faculty": user.faculty,
            "student_code": user.student_code,
            "role": user.role,
            "twofa_enabled": user.twofa_enabled,
            "twofa_method": user.twofa_method,
            "notify_successful_login": user_settings.notify_successful_login,
            "created_at": serialize_datetime(user.created_at),
            "last_login": serialize_datetime(user.last_login),
            **media,
        }

        if request.method == "GET":
            return JsonResponse({"success": True, "user": user_payload})

        return JsonResponse(
            {
                "success": True,
                "message": "Медиа успешно обновлено",
                "user": user_payload,
            }
        )
    except Exception:
        logger.exception("Failed to load profile data")
        return JsonResponse({"success": False, "detail": "Внутренняя ошибка сервера"}, status=500)


@require_http_methods(["POST"])
def update_preferences(request):
    try:
        if not request.session.get("is_authenticated"):
            return _auth_error()

        user = get_current_user(request)
        if not user:
            return _user_not_found_error()

        user_settings = get_user_settings(user)
        data = json.loads(request.body)
        notify_successful_login = data.get("notify_successful_login")

        if notify_successful_login is None:
            return JsonResponse({"success": False, "detail": "Не указана настройка уведомлений"}, status=400)

        user_settings.notify_successful_login = bool(notify_successful_login)
        user_settings.save(update_fields=["notify_successful_login", "updated_at"])

        return JsonResponse(
            {
                "success": True,
                "message": "Настройки уведомлений сохранены",
                "preferences": {
                    "notify_successful_login": user_settings.notify_successful_login,
                },
            }
        )
    except json.JSONDecodeError:
        return JsonResponse({"success": False, "detail": "Неверный формат данных"}, status=400)
    except Exception:
        logger.exception("Failed to update profile preferences")
        return JsonResponse({"success": False, "detail": "Внутренняя ошибка сервера"}, status=500)


@require_http_methods(["POST"])
def update_avatar(request):
    try:
        if not request.session.get("is_authenticated"):
            return _auth_error()

        user = get_current_user(request)
        if not user:
            return _user_not_found_error()

        from ..media_service import MediaStorage

        return JsonResponse(
            {
                "success": True,
                "message": "Аватар успешно обновлен",
                "avatar_url": None,
                "avatar_placeholder": MediaStorage.get_placeholder_data(user, "avatar"),
            }
        )
    except Exception:
        logger.exception("Failed to update avatar placeholder response")
        return JsonResponse({"success": False, "detail": "Внутренняя ошибка сервера"}, status=500)


@require_http_methods(["POST"])
def update_banner(request):
    try:
        if not request.session.get("is_authenticated"):
            return _auth_error()

        user = get_current_user(request)
        if not user:
            return _user_not_found_error()

        from ..media_service import MediaStorage

        return JsonResponse(
            {
                "success": True,
                "message": "Баннер успешно обновлен",
                "banner_url": None,
                "banner_placeholder": MediaStorage.get_placeholder_data(user, "banner"),
            }
        )
    except Exception:
        logger.exception("Failed to update banner placeholder response")
        return JsonResponse({"success": False, "detail": "Внутренняя ошибка сервера"}, status=500)


@require_http_methods(["POST"])
def change_password(request):
    try:
        if not request.session.get("is_authenticated"):
            return _auth_error()

        user = get_current_user(request)
        if not user:
            return _user_not_found_error()

        data = json.loads(request.body)
        current_password = data.get("current_password")
        new_password = data.get("new_password")
        confirm_password = data.get("confirm_password")

        if not current_password or not new_password or not confirm_password:
            return JsonResponse({"success": False, "detail": "Все поля обязательны для заполнения"}, status=400)

        if new_password != confirm_password:
            return JsonResponse({"success": False, "detail": "Новые пароли не совпадают"}, status=400)

        if len(new_password) < 7:
            return JsonResponse({"success": False, "detail": "Пароль должен содержать минимум 7 символов"}, status=400)

        if not AuthService.verify_user_password(user, current_password):
            return JsonResponse({"success": False, "detail": "Текущий пароль указан неверно"}, status=400)

        user.password = make_password(new_password)
        user.save(update_fields=["password"])

        return JsonResponse({"success": True, "message": "Пароль успешно изменен"})
    except json.JSONDecodeError:
        return JsonResponse({"success": False, "detail": "Неверный формат данных"}, status=400)
    except Exception:
        logger.exception("Failed to change password")
        return JsonResponse({"success": False, "detail": "Внутренняя ошибка сервера"}, status=500)
