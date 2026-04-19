"""
Сервисы для аутентификации, управления сессиями и вспомогательной работы с пользователями.
"""

import logging
from datetime import datetime
from typing import Optional, Tuple

from django.conf import settings
from django.contrib.auth.hashers import check_password, identify_hasher, make_password
from django.contrib.sessions.models import Session
from django.core.cache import cache
from django.utils import timezone

from ..background_jobs import BackgroundJobService, BackgroundJobType
from ..models import Administration, User, UserSession
from ..user_agent_parser import UserAgentParser

logger = logging.getLogger(__name__)

SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30


class AuthService:
    """Бизнес-логика входа, проверки пароля и регистрации."""

    FULLNAME_MAX_LENGTH = 100
    FACULTY_MAX_LENGTH = 255

    @staticmethod
    def get_unix_timestamp() -> int:
        return int(datetime.now().timestamp())

    @staticmethod
    def check_login_attempts(student_code: str) -> Tuple[bool, str]:
        user_key = f"login_attempts_user:{student_code}"
        user_attempts = cache.get(user_key, 0)

        if user_attempts >= settings.LOGIN_RATE_LIMIT_ATTEMPTS:
            return False, "Слишком много попыток входа. Попробуйте позже."

        cache.set(user_key, user_attempts + 1, settings.LOGIN_RATE_LIMIT_TTL_SECONDS)
        return True, ""

    @staticmethod
    def clear_login_attempts(student_code: str) -> None:
        cache.delete(f"login_attempts_user:{student_code}")

    @staticmethod
    def password_is_hashed(password_hash: str) -> bool:
        try:
            identify_hasher(password_hash)
            return True
        except Exception:
            return False

    @staticmethod
    def verify_user_password(user: User, raw_password: str) -> bool:
        stored_password = user.password or ""

        if AuthService.password_is_hashed(stored_password):
            return check_password(raw_password, stored_password)

        if stored_password != raw_password:
            return False

        user.password = make_password(raw_password)
        user.save(update_fields=["password"])
        return True

    @staticmethod
    def touch_last_login(user: User) -> None:
        user.last_login = AuthService.get_unix_timestamp()
        user.save(update_fields=["last_login"])

    @staticmethod
    def register_user(student_code: str, password: str, fullname: str, faculty: str) -> User:
        normalized_fullname = (fullname or "").strip()[: AuthService.FULLNAME_MAX_LENGTH] or student_code
        normalized_faculty = (faculty or "").strip()[: AuthService.FACULTY_MAX_LENGTH] or "Неизвестный факультет"

        user = User.objects.create(
            fullname=normalized_fullname,
            faculty=normalized_faculty,
            student_code=student_code,
            password=make_password(password),
            created_at=AuthService.get_unix_timestamp(),
            last_login=AuthService.get_unix_timestamp(),
        )

        try:
            BackgroundJobService.enqueue(
                BackgroundJobType.NEW_USER_NOTIFICATION,
                {
                    "user_data": {
                        "id": user.id,
                        "fullname": user.fullname,
                        "student_code": user.student_code,
                        "faculty": user.faculty,
                    }
                },
            )
        except Exception:
            logger.exception("Failed to enqueue new user notification for %s", user.student_code)

        return user

    @staticmethod
    def build_auth_user_payload(user: User) -> dict:
        return {
            "id": user.id,
            "fullname": user.fullname,
            "student_code": user.student_code,
            "faculty": user.faculty,
            "created_at": user.created_at,
        }

    @staticmethod
    def is_admin(user: User) -> bool:
        return Administration.objects.filter(administrator=user, is_active=True).exists()


class SessionService:
    """Работа с сессиями: хранение, ограничения и сериализация."""

    @staticmethod
    def create_authenticated_session(request, user: User) -> None:
        request.session["student_code"] = user.student_code
        request.session["fullname"] = user.fullname
        request.session["faculty"] = user.faculty
        request.session["is_authenticated"] = True
        request.session.set_expiry(SESSION_MAX_AGE_SECONDS)
        request.session.save()

    @staticmethod
    def enforce_session_limits(student_code: str, current_session_key: str, request=None) -> None:
        if not student_code or not current_session_key:
            return

        browser_info = {}
        ip_address = None

        if request:
            x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
            if x_forwarded_for:
                ip_address = x_forwarded_for.split(",")[0].strip()
            else:
                ip_address = request.META.get("REMOTE_ADDR")

            browser_info = UserAgentParser.parse(request.META.get("HTTP_USER_AGENT", ""))

        session, created = UserSession.objects.get_or_create(
            session_key=current_session_key,
            defaults={
                "student_code": student_code,
                "user_agent": request.META.get("HTTP_USER_AGENT", "") if request else "",
                "browser": browser_info.get("browser"),
                "os": browser_info.get("os"),
                "ip_address": ip_address,
            },
        )

        if not created:
            session.last_activity = timezone.now()
            session.save(update_fields=["last_activity"])

        sessions = list(UserSession.objects.filter(student_code=student_code).order_by("-created_at"))
        if len(sessions) <= 2:
            return

        for session_entry in sessions[2:]:
            Session.objects.filter(session_key=session_entry.session_key).delete()
            session_entry.delete()

    @staticmethod
    def logout(request) -> None:
        session_key = request.session.session_key
        request.session.flush()
        if session_key:
            UserSession.objects.filter(session_key=session_key).delete()

    @staticmethod
    def get_user_sessions(student_code: str, current_session_key: Optional[str] = None) -> list:
        sessions_data = []
        for session in UserSession.objects.filter(student_code=student_code).order_by("-last_activity"):
            is_current = current_session_key is not None and session.session_key == current_session_key
            sessions_data.append(
                {
                    "id": session.id,
                    "session_key": session.session_key,
                    "browser": session.browser or "Неизвестный браузер",
                    "os": session.os or "Неизвестная ОС",
                    "ip_address": session.ip_address or "Неизвестный IP",
                    "created_at": session.created_at.isoformat() if session.created_at else None,
                    "last_activity": session.last_activity.isoformat() if session.last_activity else None,
                    "is_current": is_current,
                    "status": "active" if is_current else "inactive",
                }
            )
        return sessions_data


class UserService:
    """Небольшие вспомогательные методы для поиска пользователей."""

    @staticmethod
    def get_user_by_code(student_code: str) -> Optional[User]:
        return User.objects.filter(student_code=student_code).first()

    @staticmethod
    def user_exists(student_code: str) -> bool:
        return User.objects.filter(student_code=student_code).exists()
