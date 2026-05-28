"""
Authentication and session services.
"""

import logging
import re
from typing import Optional, Tuple

from django.conf import settings
from django.contrib.auth import login as django_login
from django.contrib.auth import logout as django_logout
from django.contrib.auth.hashers import check_password, identify_hasher, make_password
from django.contrib.sessions.models import Session
from django.core.cache import cache
from django.utils import timezone

from ..background_jobs import BackgroundJobService, BackgroundJobType
from ..common.permissions import is_system_administrator
from ..common.utils import get_user_media, get_user_settings, serialize_datetime, serialize_user_preferences
from ..models import User, UserSession
from ..user_agent_parser import UserAgentParser

logger = logging.getLogger(__name__)

SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30
_CLIENT_KEY_UNSAFE_CHARS = re.compile(r"[^a-zA-Z0-9:._-]+")


def get_client_ip(request) -> str:
    if not request:
        return ""

    if getattr(settings, "TRUST_X_FORWARDED_FOR", False):
        forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
        forwarded_parts = [part.strip() for part in forwarded_for.split(",") if part.strip()]
        if forwarded_parts:
            return forwarded_parts[0]

    return (request.META.get("REMOTE_ADDR", "") or "").strip()


def _safe_cache_key_part(value: str) -> str:
    return _CLIENT_KEY_UNSAFE_CHARS.sub("_", value or "")[:160]


class AuthService:
    """Business logic for login, password verification, and registration."""

    FULLNAME_MAX_LENGTH = 100
    FACULTY_MAX_LENGTH = 255

    @staticmethod
    def current_datetime():
        return timezone.now()

    @staticmethod
    def _login_rate_limit_keys(student_code: str, request=None) -> list[str]:
        keys = [f"login_attempts_user:{student_code}"]

        if not request:
            return keys

        ip_address = get_client_ip(request)
        session_key = request.session.session_key or "anonymous"
        user_agent = (request.META.get("HTTP_USER_AGENT", "") or "")[:120]

        if ip_address:
            keys.append(f"login_attempts_ip:{_safe_cache_key_part(ip_address)}")

        if ip_address or user_agent:
            keys.append(
                "login_attempts_client:"
                f"{_safe_cache_key_part(ip_address)}:"
                f"{_safe_cache_key_part(session_key)}:"
                f"{_safe_cache_key_part(user_agent)}"
            )

        return keys

    @staticmethod
    def check_login_attempts(student_code: str, request=None) -> Tuple[bool, str]:
        keys = AuthService._login_rate_limit_keys(student_code, request)
        user_limit = settings.LOGIN_RATE_LIMIT_ATTEMPTS
        ip_limit = user_limit

        for key in keys:
            attempts = cache.get(key, 0)
            limit = ip_limit if key.startswith("login_attempts_ip:") else user_limit
            if attempts >= limit:
                return False, "Слишком много попыток входа. Попробуйте позже."

        for key in keys:
            attempts = cache.get(key, 0)
            cache.set(key, attempts + 1, settings.LOGIN_RATE_LIMIT_TTL_SECONDS)

        return True, ""

    @staticmethod
    def clear_login_attempts(student_code: str, request=None) -> None:
        for key in AuthService._login_rate_limit_keys(student_code, request):
            cache.delete(key)

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
        user.last_login = AuthService.current_datetime()
        user.save(update_fields=["last_login"])

    @staticmethod
    def register_user(student_code: str, password: str, fullname: str, faculty: str) -> User:
        from ..referral_service import ReferralService

        normalized_fullname = (fullname or "").strip()[: AuthService.FULLNAME_MAX_LENGTH] or student_code
        normalized_faculty = (faculty or "").strip()[: AuthService.FACULTY_MAX_LENGTH] or "Неизвестный факультет"

        user = User.objects.create(
            fullname=normalized_fullname,
            faculty=normalized_faculty,
            student_code=student_code,
            role=User.ROLE_STUDENT,
            password=make_password(password),
            created_at=AuthService.current_datetime(),
            last_login=AuthService.current_datetime(),
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

        ReferralService.ensure_user_referral_code(user)
        return user

    @staticmethod
    def build_auth_user_payload(user: User) -> dict:
        from ..referral_service import ReferralService

        user_settings = get_user_settings(user)
        media = get_user_media(user)
        preferences = serialize_user_preferences(user_settings)
        return {
            "id": user.id,
            "fullname": user.fullname,
            "student_code": user.student_code,
            "faculty": user.faculty,
            "role": user.role,
            "twofa_enabled": user.twofa_enabled,
            "twofa_method": user.twofa_method,
            **preferences,
            "preferences": preferences,
            "created_at": serialize_datetime(user.created_at),
            "last_login": serialize_datetime(user.last_login),
            "referral": ReferralService.get_referral_summary(user),
            **media,
        }

    @staticmethod
    def is_admin(user: User) -> bool:
        return is_system_administrator(user)


class SessionService:
    """Session lifecycle and active session tracking."""

    @staticmethod
    def _write_product_session(request, user: User, *, twofa_pending: bool, twofa_verified: bool) -> None:
        request.session["student_code"] = user.student_code
        request.session["fullname"] = user.fullname
        request.session["faculty"] = user.faculty
        request.session["is_authenticated"] = True
        request.session["twofa_pending"] = twofa_pending
        request.session["twofa_verified"] = twofa_verified
        request.session.set_expiry(SESSION_MAX_AGE_SECONDS)

    @staticmethod
    def begin_authenticated_session(request, user: User) -> None:
        request.session.cycle_key()
        SessionService._write_product_session(
            request,
            user,
            twofa_pending=False,
            twofa_verified=False,
        )
        request.session.save()

    @staticmethod
    def finalize_authenticated_session(request, user: User) -> None:
        backend_path = getattr(user, "backend", None) or "django.contrib.auth.backends.ModelBackend"
        django_login(request, user, backend=backend_path)
        SessionService._write_product_session(
            request,
            user,
            twofa_pending=False,
            twofa_verified=True,
        )
        request.session.save()

    @staticmethod
    def enforce_session_limits(student_code: str, current_session_key: str, request=None) -> None:
        if not student_code or not current_session_key:
            return

        browser_info = {}
        ip_address = None

        if request:
            ip_address = get_client_ip(request) or None
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
        django_logout(request)
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
    """Small helpers for fetching users."""

    @staticmethod
    def get_user_by_code(student_code: str) -> Optional[User]:
        return User.objects.filter(student_code=student_code).first()

    @staticmethod
    def user_exists(student_code: str) -> bool:
        return User.objects.filter(student_code=student_code).exists()
