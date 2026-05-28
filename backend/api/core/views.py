"""
Представления для аутентификации и управления сессиями.
"""

import logging

from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.views import APIView

from ..ban_service import BanService
from ..common.decorators import allow_unverified_2fa
from ..common.drf import SessionUserAPIView
from ..common.permissions import is_system_administrator
from ..common.utils import get_current_user, get_user_full_data, is_request_authenticated, serialize_datetime
from ..func import authorize
from ..models import User
from ..notification_service import NotificationService
from ..referral_service import ReferralService
from ..twofa_service import twofa_service
from .serializers import DashboardQuerySerializer, SaveDataSerializer, ThemeSerializer
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


@method_decorator(allow_unverified_2fa, name="dispatch")
class SaveDataView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = SaveDataSerializer(data=request.data)
        if not serializer.is_valid():
            data = serializer.initial_data or {}
            if not data.get("studentCode") or not data.get("password"):
                return JsonResponse({"detail": "Отсутствуют обязательные поля"}, status=400)
            return JsonResponse(
                {"detail": "Некорректный формат данных. Пароль должен содержать минимум 7 символов"},
                status=400,
            )

        student_code = serializer.validated_data["studentCode"]
        password = serializer.validated_data["password"]
        referral_code = serializer.validated_data.get("referralCode")

        try:
            can_login, error_message = AuthService.check_login_attempts(student_code, request)
            if not can_login:
                return JsonResponse({"detail": error_message}, status=429)

            existing_user = User.objects.filter(student_code=student_code).first()
            if existing_user:
                if not AuthService.verify_user_password(existing_user, password):
                    return JsonResponse({"detail": "Неверные данные авторизации"}, status=401)

                ban_status = BanService.check_ban_status(existing_user.student_code)
                if ban_status["is_banned"]:
                    AuthService.clear_login_attempts(student_code, request)
                    return JsonResponse(
                        {
                            "success": False,
                            "detail": "Аккаунт заблокирован",
                            "is_banned": True,
                            "ban_info": ban_status.get("ban_info"),
                        },
                        status=403,
                    )

                AuthService.clear_login_attempts(student_code, request)
                if twofa_service.is_2fa_required(existing_user):
                    SessionService.begin_authenticated_session(request, existing_user)
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

                SessionService.finalize_authenticated_session(request, existing_user)
                SessionService.enforce_session_limits(existing_user.student_code, request.session.session_key, request)
                AuthService.touch_last_login(existing_user)
                NotificationService.create(
                    existing_user,
                    notification_type="login_success",
                    title="Новый вход в аккаунт",
                    body="Вы успешно вошли в Bentum.",
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
            referral_result = ReferralService.apply_referral(user, referral_code, source="site")

            SessionService.finalize_authenticated_session(request, user)
            SessionService.enforce_session_limits(user.student_code, request.session.session_key, request)

            return JsonResponse(
                {
                    "success": True,
                    "message": "Регистрация прошла успешно",
                    "referral_warning": None if referral_result.applied or not referral_result.message else referral_result.message,
                    "user": AuthService.build_auth_user_payload(user),
                },
                status=200,
            )
        except Exception:
            logger.exception("Authentication error")
            return JsonResponse({"detail": "Внутренняя ошибка сервера"}, status=500)


class DashboardView(SessionUserAPIView):
    def get(self, request):
        query_serializer = DashboardQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=False)

        viewer, error_response = self.get_session_user(request)
        if error_response:
            return JsonResponse({"detail": "Пользователь не авторизован"}, status=401)

        student_code = query_serializer.validated_data.get("student_code") or viewer.student_code
        if viewer.student_code != student_code:
            return JsonResponse({"detail": "Доступ запрещён"}, status=403)

        try:
            user = User.objects.get(student_code=student_code)
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


@method_decorator(allow_unverified_2fa, name="dispatch")
@method_decorator(ensure_csrf_cookie, name="dispatch")
class AuthCheckView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        if not is_request_authenticated(request):
            return JsonResponse({"success": False, "detail": "Пользователь не авторизован"}, status=401)

        user = get_current_user(request)
        if user is None:
            return JsonResponse({"success": False, "detail": "Отсутствует код студента"}, status=401)

        try:
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


@method_decorator(allow_unverified_2fa, name="dispatch")
class LogoutView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        try:
            SessionService.logout(request)
            return JsonResponse({"success": True, "message": "Выход выполнен успешно"}, status=200)
        except Exception:
            logger.exception("Logout error")
            return JsonResponse({"success": False, "detail": "Ошибка при выходе из системы"}, status=500)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class ThemeView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        return JsonResponse({"success": True, "theme": request.session.get("theme", "dark")}, status=200)

    def post(self, request):
        serializer = ThemeSerializer(data=request.data)
        if not serializer.is_valid():
            return JsonResponse({"detail": "Некорректная тема"}, status=400)

        selected_theme = serializer.validated_data["theme"]
        request.session["theme"] = selected_theme
        request.session.modified = True
        request.session.save()
        return JsonResponse({"success": True, "theme": selected_theme}, status=200)


class UserSessionsView(SessionUserAPIView):
    def get(self, request):
        try:
            user, error_response = self.get_session_user(request)
            if error_response:
                return error_response

            current_session_key = request.session.session_key
            sessions_data = SessionService.get_user_sessions(
                user.student_code,
                current_session_key=current_session_key,
            )

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


save_data = SaveDataView.as_view()
dashboard = DashboardView.as_view()
auth_check = AuthCheckView.as_view()
logout = LogoutView.as_view()
theme = ThemeView.as_view()
get_user_sessions = UserSessionsView.as_view()
