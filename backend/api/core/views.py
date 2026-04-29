"""
Представления для аутентификации и управления сессиями.
"""

import json
import logging

from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie

from ..ban_service import BanService
from ..common.decorators import allow_unverified_2fa
from ..common.permissions import is_system_administrator
from ..common.utils import get_user_full_data, serialize_datetime
from ..func import authorize
from ..models import User
from ..twofa_service import twofa_service
from .services import AuthService, SessionService

logger = logging.getLogger(__name__)


def _build_authenticated_user_payload(user: User) -> dict:
    payload = AuthService.build_auth_user_payload(user)
    payload["is_banned"] = BanService.check_ban_status(user.student_code)["is_banned"]
    payload["is_admin"] = is_system_administrator(user)
    return payload


def _send_or_reuse_twofa_code(request, user: User) -> tuple[bool, int, str]:
    existing_code, remaining_time = twofa_service.get_existing_code(user.student_code)
    if existing_code and remaining_time > 0:
        logger.info("Reusing existing 2FA code for %s", user.student_code)
        return True, remaining_time, ""

    code = twofa_service.generate_6fa_code()
    twofa_service.store_2fa_code(user.student_code, code, request)

    if user.twofa_method != "telegram":
        return False, 0, "Неподдерживаемый метод 2FA"

    success, message = twofa_service.send_2fa_code_telegram_sync(user, code)

    if not success:
        return False, 0, message

    return True, 300, ""


@allow_unverified_2fa
@ensure_csrf_cookie
def csrf_token(request):
    return JsonResponse(
        {
            "success": True,
            "csrfToken": get_token(request),
        }
    )


@allow_unverified_2fa
def save_data(request):
    if request.method != "POST":
        return JsonResponse({"detail": "Метод не разрешён"}, status=405)

    try:
        data = json.loads(request.body.decode("utf-8") if isinstance(request.body, bytes) else request.body)
        student_code = data.get("studentCode")
        password = data.get("password")

        if not student_code or not password:
            return JsonResponse({"detail": "Отсутствуют обязательные поля"}, status=400)

        if len(student_code) != 10 or len(password) < 7:
            return JsonResponse(
                {"detail": "Некорректный формат данных. Пароль должен содержать минимум 7 символов"},
                status=400,
            )

        can_login, error_message = AuthService.check_login_attempts(student_code, request)
        if not can_login:
            return JsonResponse({"detail": error_message}, status=429)

        existing_user = User.objects.filter(student_code=student_code).first()
        if existing_user:
            if not AuthService.verify_user_password(existing_user, password):
                return JsonResponse({"detail": "Неверный пароль"}, status=401)

            AuthService.clear_login_attempts(student_code, request)
            AuthService.touch_last_login(existing_user)
            SessionService.create_authenticated_session(request, existing_user)
            SessionService.enforce_session_limits(existing_user.student_code, request.session.session_key, request)

            if twofa_service.is_2fa_required(existing_user):
                success, remaining_time, message = _send_or_reuse_twofa_code(request, existing_user)
                if not success:
                    return JsonResponse(
                        {"success": False, "detail": f"Ошибка отправки 2FA-кода: {message}"},
                        status=500,
                    )

                request.session["twofa_pending"] = True
                request.session["twofa_verified"] = False
                request.session.save()

                return JsonResponse(
                    {
                        "success": True,
                        "message": "Вход выполнен, требуется подтверждение 2FA",
                        "requires_2fa": True,
                        "remaining_time": remaining_time,
                        "user": _build_authenticated_user_payload(existing_user),
                    },
                    status=200,
                )

            return JsonResponse(
                {
                    "success": True,
                    "message": "Вход выполнен успешно",
                    "user": _build_authenticated_user_payload(existing_user),
                },
                status=200,
            )

        auth_result = authorize(student_code, password)
        if auth_result is False:
            return JsonResponse({"detail": "Неверные данные авторизации"}, status=401)

        AuthService.clear_login_attempts(student_code, request)
        fullname, faculty = auth_result
        user = AuthService.register_user(student_code, password, fullname, faculty)

        SessionService.create_authenticated_session(request, user)
        SessionService.enforce_session_limits(user.student_code, request.session.session_key, request)

        return JsonResponse(
            {
                "success": True,
                "message": "Регистрация прошла успешно",
                "user": AuthService.build_auth_user_payload(user),
            },
            status=200,
        )

    except json.JSONDecodeError:
        return JsonResponse({"detail": "Некорректный JSON"}, status=400)
    except Exception:
        logger.exception("Authentication error")
        return JsonResponse({"detail": "Внутренняя ошибка сервера"}, status=500)


def dashboard(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Метод не разрешён"}, status=405)

    student_code = request.GET.get("student_code") or request.session.get("student_code")
    if not request.session.get("is_authenticated") or not student_code:
        return JsonResponse({"detail": "Пользователь не авторизован"}, status=401)

    try:
        user = User.objects.get(student_code=student_code)
        if request.session.get("student_code") != student_code:
            return JsonResponse({"detail": "Доступ запрещён"}, status=403)

        ban_status = BanService.check_ban_status(student_code)
        return JsonResponse(
            {
                "success": True,
                "theme": request.session.get("theme", "dark"),
                "user": {
                    "id": user.id,
                    "fullname": user.fullname,
                    "faculty": user.faculty,
                    "student_code": user.student_code,
                    "role": user.role,
                    "created_at": serialize_datetime(user.created_at),
                    "is_banned": ban_status["is_banned"],
                    "last_login": serialize_datetime(user.last_login),
                },
            },
            status=200,
        )
    except User.DoesNotExist:
        return JsonResponse({"detail": "Пользователь не найден"}, status=404)
    except Exception:
        logger.exception("Dashboard error")
        return JsonResponse({"detail": "Ошибка при работе с базой данных"}, status=500)


@allow_unverified_2fa
@ensure_csrf_cookie
def auth_check(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Метод не разрешён"}, status=405)

    if not request.session.get("is_authenticated"):
        return JsonResponse({"success": False, "detail": "Пользователь не авторизован"}, status=401)

    student_code = request.session.get("student_code")
    if not student_code:
        return JsonResponse({"success": False, "detail": "Отсутствует код студента"}, status=401)

    try:
        user = User.objects.get(student_code=student_code)
        if getattr(user, "twofa_enabled", False) and not request.session.get("twofa_verified", False):
            return JsonResponse(
                {
                    "success": False,
                    "detail": "Требуется повторная аутентификация",
                    "requires_2fa": True,
                },
                status=401,
            )

        return JsonResponse({"success": True, "user": get_user_full_data(user)}, status=200)
    except User.DoesNotExist:
        return JsonResponse({"success": False, "detail": "Пользователь не найден"}, status=404)
    except Exception:
        logger.exception("auth_check error")
        return JsonResponse({"success": False, "detail": "Ошибка при проверке авторизации"}, status=500)


@allow_unverified_2fa
def logout(request):
    if request.method != "POST":
        return JsonResponse({"detail": "Метод не разрешён"}, status=405)

    try:
        SessionService.logout(request)
        return JsonResponse({"success": True, "message": "Выход выполнен успешно"}, status=200)
    except Exception:
        logger.exception("Logout error")
        return JsonResponse({"success": False, "detail": "Ошибка при выходе из системы"}, status=500)


@ensure_csrf_cookie
def theme(request):
    if request.method == "GET":
        return JsonResponse({"success": True, "theme": request.session.get("theme", "dark")}, status=200)

    if request.method != "POST":
        return JsonResponse({"detail": "Метод не разрешён"}, status=405)

    try:
        data = json.loads(request.body)
        selected_theme = data.get("theme")
        if selected_theme not in ("dark", "light"):
            return JsonResponse({"detail": "Некорректная тема"}, status=400)

        request.session["theme"] = selected_theme
        request.session.modified = True
        request.session.save()

        return JsonResponse({"success": True, "theme": selected_theme}, status=200)
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Некорректный JSON"}, status=400)


def get_user_sessions(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Метод не разрешён"}, status=405)

    try:
        if not request.session.get("is_authenticated"):
            return JsonResponse({"success": False, "detail": "Требуется авторизация"}, status=401)

        student_code = request.session.get("student_code")
        current_session_key = request.session.session_key
        sessions_data = SessionService.get_user_sessions(student_code, current_session_key=current_session_key)

        return JsonResponse(
            {
                "success": True,
                "sessions": sessions_data,
                "total_count": len(sessions_data),
            }
        )
    except Exception:
        logger.exception("Sessions error")
        return JsonResponse({"success": False, "detail": "Ошибка загрузки сессий"}, status=500)
