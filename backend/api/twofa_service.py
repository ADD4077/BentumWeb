"""Сервис двухфакторной аутентификации."""

import logging
import random
import string
import urllib.parse
import urllib.request

from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail

from .models import TelegramBinding

logger = logging.getLogger(__name__)


class TwoFAService:
    """Сервис для обработки двухфакторной аутентификации."""

    def is_2fa_required(self, user):
        """Проверить, требуется ли 2FA для пользователя."""
        if not user:
            return False

        if not getattr(user, "twofa_enabled", False):
            return False

        return user.twofa_method in ["telegram", "email"]

    def generate_6fa_code(self):
        """Сгенерировать 6-значный код 2FA."""
        return "".join(random.choices(string.digits, k=6))

    def get_existing_code(self, student_code):
        """Получить существующий действительный код, если он есть."""
        cache_key_code = f"2fa_code_{student_code}"
        cache_key_time = f"2fa_time_{student_code}"

        code = cache.get(cache_key_code)
        timestamp = cache.get(cache_key_time)

        if code and timestamp:
            import time

            remaining = 300 - (int(time.time()) - timestamp)
            if remaining > 0:
                return code, remaining
        return None, 0

    def store_2fa_code(self, student_code, code, request=None):
        """Сохранить код 2FA в кэш и при необходимости в сессию."""
        cache_key_code = f"2fa_code_{student_code}"
        cache_key_time = f"2fa_time_{student_code}"

        import time

        timestamp = int(time.time())

        cache.set(cache_key_code, code, timeout=300)
        cache.set(cache_key_time, timestamp, timeout=300)

        if request and hasattr(request, "session"):
            request.session["2fa_code"] = code
            request.session["2fa_timestamp"] = timestamp
            request.session["2fa_session_key"] = request.session.session_key
            request.session.save()

        stored_code = cache.get(cache_key_code)
        stored_time = cache.get(cache_key_time)
        logger.info(
            "Stored 2FA code for %s: code=%s, stored=%s, time=%s",
            student_code,
            code,
            stored_code,
            stored_time,
        )

    def verify_2fa_code(self, student_code: str, code: str, request=None) -> bool:
        """Проверить код 2FA по кэшу и при необходимости по сессии."""
        cache_key_code = f"2fa_code_{student_code}"
        cache_key_time = f"2fa_time_{student_code}"

        stored_code = cache.get(cache_key_code)

        if stored_code is None and request and hasattr(request, "session"):
            stored_code = request.session.get("2fa_code")
            stored_time = request.session.get("2fa_timestamp")
            stored_session_key = request.session.get("2fa_session_key")

            if stored_code and stored_time:
                if stored_session_key and stored_session_key != request.session.session_key:
                    stored_code = None
                else:
                    import time

                    remaining = 300 - (int(time.time()) - stored_time)
                    if remaining <= 0:
                        stored_code = None

        logger.info("Verifying 2FA for %s: provided=%s, stored=%s", student_code, code, stored_code)

        if stored_code and stored_code == code:
            cache.delete(cache_key_code)
            cache.delete(cache_key_time)
            if request and hasattr(request, "session"):
                request.session.pop("2fa_code", None)
                request.session.pop("2fa_timestamp", None)
                request.session.pop("2fa_session_key", None)
            logger.info("2FA verified successfully for %s", student_code)
            return True

        logger.warning("2FA verification failed for %s: provided=%s, stored=%s", student_code, code, stored_code)
        return False

    def send_2fa_code_telegram_sync(self, user, code):
        """Отправить код 2FA через Telegram."""
        try:
            bot_token = getattr(settings, "TELEGRAM_BOT_TOKEN", None)
            if not bot_token:
                return False, "TELEGRAM_BOT_TOKEN не настроен"

            binding = TelegramBinding.objects.filter(user=user, is_active=True).select_related("user").first()
            if not binding or not binding.telegram_id or binding.telegram_id == 0:
                return False, "Telegram аккаунт не привязан"

            chat_id = binding.telegram_id
            text = (
                "Код двухфакторной аутентификации (2FA): "
                f"{code}\n\n"
                "Если это не вы, просто проигнорируйте сообщение."
            )

            url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            data = urllib.parse.urlencode(
                {
                    "chat_id": str(chat_id),
                    "text": text,
                }
            ).encode("utf-8")

            request = urllib.request.Request(url, data=data, method="POST")
            with urllib.request.urlopen(request, timeout=10) as response:
                body = response.read().decode("utf-8", errors="ignore")
                if response.status != 200:
                    return False, f"Telegram API returned {response.status}: {body[:200]}"

            logger.info("Sent 2FA code to Telegram for user %s (chat_id=%s)", user.student_code, chat_id)
            return True, "Код 2FA успешно отправлен"
        except Exception as error:
            logger.error("Error sending 2FA code via Telegram: %s", error)
            return False, str(error)

    def send_2fa_code_email(self, user, code):
        """Отправить код 2FA через email."""
        try:
            email = getattr(user, "email", None) or getattr(user, "student_code", None)
            if not email:
                return False, "У пользователя нет email адреса"

            if "@" not in str(email):
                email = f"{email}@student.bntu.by"

            subject = "Код двухфакторной аутентификации (2FA)"
            message = (
                f"Ваш код двухфакторной аутентификации: {code}\n\n"
                "Код действителен в течение 5 минут.\n\n"
                "Если это не вы, проигнорируйте это сообщение."
            )

            from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@bentum.by")

            send_mail(
                subject=subject,
                message=message,
                from_email=from_email,
                recipient_list=[email],
                fail_silently=False,
            )

            logger.info("Sent 2FA code to email for user %s", user.student_code)
            return True, "Код 2FA успешно отправлен"
        except Exception as error:
            logger.error("Error sending 2FA code via email: %s", error)
            return False, str(error)


twofa_service = TwoFAService()
