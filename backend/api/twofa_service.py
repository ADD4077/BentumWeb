"""2FA service helpers."""

import logging
import secrets
import string
import time
import urllib.parse
import urllib.request

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

from .models import TelegramBinding
from .user_agent_parser import UserAgentParser

logger = logging.getLogger(__name__)


class TwoFAService:
    """Telegram-backed two-factor authentication helpers."""

    def is_2fa_required(self, user):
        if not user:
            return False
        if not getattr(user, "twofa_enabled", False):
            return False
        return user.twofa_method == "telegram"

    def generate_6fa_code(self):
        return "".join(secrets.choice(string.digits) for _ in range(6))

    def _session_scope(self, request=None):
        session_key = "no-session"
        ip_address = "unknown"

        if request is not None and hasattr(request, "session"):
            session_key = request.session.session_key or session_key
            meta = getattr(request, "META", {}) or {}
            x_forwarded_for = meta.get("HTTP_X_FORWARDED_FOR")
            if x_forwarded_for:
                ip_address = x_forwarded_for.split(",")[0].strip()
            else:
                ip_address = meta.get("REMOTE_ADDR") or ip_address

        return session_key, ip_address

    def _code_key(self, student_code: str) -> str:
        return f"2fa_code:{student_code}"

    def _time_key(self, student_code: str) -> str:
        return f"2fa_time:{student_code}"

    def _verify_attempts_key(self, student_code: str, request=None) -> str:
        session_key, ip_address = self._session_scope(request)
        return f"2fa_verify_attempts:{student_code}:{session_key}:{ip_address}"

    def _resend_cooldown_key(self, student_code: str, request=None) -> str:
        session_key, ip_address = self._session_scope(request)
        return f"2fa_resend_cooldown:{student_code}:{session_key}:{ip_address}"

    def get_existing_code(self, student_code):
        code = cache.get(self._code_key(student_code))
        timestamp = cache.get(self._time_key(student_code))
        if code and timestamp:
            remaining = settings.TWOFA_CODE_TTL_SECONDS - (int(time.time()) - timestamp)
            if remaining > 0:
                return code, remaining
        return None, 0

    def get_verify_lockout_seconds(self, student_code: str, request=None) -> int:
        attempts = int(cache.get(self._verify_attempts_key(student_code, request), 0) or 0)
        if attempts < settings.TWOFA_VERIFY_MAX_ATTEMPTS:
            return 0
        _code, remaining = self.get_existing_code(student_code)
        return remaining or settings.TWOFA_CODE_TTL_SECONDS

    def register_failed_verify_attempt(self, student_code: str, request=None) -> int:
        key = self._verify_attempts_key(student_code, request)
        attempts = int(cache.get(key, 0) or 0) + 1
        cache.set(key, attempts, timeout=settings.TWOFA_CODE_TTL_SECONDS)
        return attempts

    def clear_verify_attempts(self, student_code: str, request=None) -> None:
        cache.delete(self._verify_attempts_key(student_code, request))

    def get_resend_cooldown_seconds(self, student_code: str, request=None) -> int:
        cooldown_until = cache.get(self._resend_cooldown_key(student_code, request))
        if not cooldown_until:
            return 0
        remaining = int(cooldown_until - time.time())
        return remaining if remaining > 0 else 0

    def register_resend(self, student_code: str, request=None) -> None:
        cooldown_until = time.time() + settings.TWOFA_RESEND_COOLDOWN_SECONDS
        cache.set(
            self._resend_cooldown_key(student_code, request),
            cooldown_until,
            timeout=settings.TWOFA_RESEND_COOLDOWN_SECONDS,
        )

    def store_2fa_code(self, student_code, code, request=None):
        timestamp = int(time.time())
        cache.set(self._code_key(student_code), code, timeout=settings.TWOFA_CODE_TTL_SECONDS)
        cache.set(self._time_key(student_code), timestamp, timeout=settings.TWOFA_CODE_TTL_SECONDS)

        if request is not None and hasattr(request, "session"):
            request.session["2fa_code"] = code
            request.session["2fa_timestamp"] = timestamp
            request.session["2fa_session_key"] = request.session.session_key
            request.session.save()

        self.clear_verify_attempts(student_code, request)
        logger.info("Stored 2FA code for %s", student_code)

    def verify_2fa_code(self, student_code: str, code: str, request=None) -> bool:
        if self.get_verify_lockout_seconds(student_code, request) > 0:
            logger.warning("2FA verify blocked by lockout for %s", student_code)
            return False

        stored_code = cache.get(self._code_key(student_code))
        if stored_code is None and request is not None and hasattr(request, "session"):
            stored_code = request.session.get("2fa_code")
            stored_time = request.session.get("2fa_timestamp")
            stored_session_key = request.session.get("2fa_session_key")
            if stored_code and stored_time:
                if stored_session_key and stored_session_key != request.session.session_key:
                    stored_code = None
                else:
                    remaining = settings.TWOFA_CODE_TTL_SECONDS - (int(time.time()) - stored_time)
                    if remaining <= 0:
                        stored_code = None

        if stored_code and stored_code == code:
            cache.delete(self._code_key(student_code))
            cache.delete(self._time_key(student_code))
            self.clear_verify_attempts(student_code, request)
            if request is not None and hasattr(request, "session"):
                request.session.pop("2fa_code", None)
                request.session.pop("2fa_timestamp", None)
                request.session.pop("2fa_session_key", None)
            logger.info("2FA verified successfully for %s", student_code)
            return True

        self.register_failed_verify_attempt(student_code, request)
        logger.warning("2FA verification failed for %s", student_code)
        return False

    def _send_telegram_message(self, user, text):
        try:
            bot_token = getattr(settings, "TELEGRAM_BOT_TOKEN", None)
            if not bot_token:
                return False, "TELEGRAM_BOT_TOKEN not configured"

            binding = TelegramBinding.objects.filter(user=user, is_active=True).select_related("user").first()
            if not binding or not binding.telegram_id or binding.telegram_id == 0:
                return False, "Telegram account is not linked"

            url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            data = urllib.parse.urlencode(
                {
                    "chat_id": str(binding.telegram_id),
                    "text": text,
                }
            ).encode("utf-8")

            request = urllib.request.Request(url, data=data, method="POST")
            with urllib.request.urlopen(request, timeout=10) as response:
                body = response.read().decode("utf-8", errors="ignore")
                if response.status != 200:
                    return False, f"Telegram API returned {response.status}: {body[:200]}"

            logger.info("Sent Telegram message for user %s (chat_id=%s)", user.student_code, binding.telegram_id)
            return True, "Message sent"
        except Exception as error:
            logger.error("Error sending Telegram message: %s", error)
            return False, str(error)

    def send_2fa_code_telegram_sync(self, user, code):
        text = (
            "Код двухфакторной аутентификации (2FA): "
            f"{code}\n\n"
            "Если это не вы, просто проигнорируйте сообщение."
        )
        ok, message = self._send_telegram_message(user, text)
        if ok:
            return True, "2FA code sent"
        return ok, message

    def send_login_success_telegram_sync(self, user, request=None):
        timestamp = timezone.localtime().strftime("%d.%m.%Y %H:%M")
        ip_address = None
        device = "Неизвестно"
        browser = "Неизвестно"

        if request is not None:
            x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
            if x_forwarded_for:
                ip_address = x_forwarded_for.split(",")[0].strip()
            else:
                ip_address = request.META.get("REMOTE_ADDR")

            agent_info = UserAgentParser.parse(request.META.get("HTTP_USER_AGENT", ""))
            device = agent_info.get("os") or "Неизвестно"
            browser = agent_info.get("browser") or "Неизвестно"

        name = getattr(user, "fullname", None) or "Пользователь"

        text = (
            f"{name}, выполнен успешный вход в аккаунт Бентум.\n"
            f"Устройство: {device}\n"
            f"Браузер: {browser}\n\n"
            f"Время: {timestamp}"
        )

        if ip_address:
            text += f"\nIP: {ip_address}"

        text += "\n\nЕсли это были не вы, смените пароль и проверьте активные сессии."
        return self._send_telegram_message(user, text)


twofa_service = TwoFAService()
