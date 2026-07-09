from __future__ import annotations

import asyncio
import os
import secrets
import string
from dataclasses import dataclass

from aiogram import Bot
from django.conf import settings
from django.utils import timezone

from .models import User


REFERRAL_ALPHABET = string.ascii_uppercase + string.digits


@dataclass(slots=True)
class ReferralApplyResult:
    applied: bool
    message: str | None = None


class ReferralService:
    CODE_LENGTH = 8
    _cached_bot_username: str | None = None

    @staticmethod
    def normalize_referral_code(value: str | None) -> str:
        return (value or "").strip().upper()

    @classmethod
    def generate_unique_referral_code(cls) -> str:
        while True:
            code = "".join(secrets.choice(REFERRAL_ALPHABET) for _ in range(cls.CODE_LENGTH))
            if not User.objects.filter(referral_code=code).exists():
                return code

    @classmethod
    def ensure_user_referral_code(cls, user: User) -> str:
        if user.referral_code:
            return user.referral_code

        user.referral_code = cls.generate_unique_referral_code()
        user.save(update_fields=["referral_code"])
        return user.referral_code

    @classmethod
    async def _detect_bot_username_async(cls) -> str | None:
        bot_token = getattr(settings, "TELEGRAM_BOT_TOKEN", None) or os.getenv("TELEGRAM_BOT_TOKEN", "")
        if not bot_token:
            return None

        bot = Bot(token=bot_token)
        try:
            bot_info = await bot.get_me()
            username = (getattr(bot_info, "username", "") or "").strip().lstrip("@")
            cls._cached_bot_username = username or None
            return cls._cached_bot_username
        except Exception:
            return None
        finally:
            await bot.session.close()

    @classmethod
    def resolve_bot_username(cls, bot_username: str | None = None) -> str | None:
        explicit_username = (bot_username or "").strip().lstrip("@")
        if explicit_username:
            cls._cached_bot_username = explicit_username
            return explicit_username

        configured_username = (getattr(settings, "TELEGRAM_BOT_USERNAME", "") or "").strip().lstrip("@")
        if configured_username:
            cls._cached_bot_username = configured_username
            return configured_username

        if cls._cached_bot_username:
            return cls._cached_bot_username

        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        return loop.run_until_complete(cls._detect_bot_username_async())

    @classmethod
    def apply_referral(
        cls,
        user: User,
        referral_code: str | None,
        *,
        source: str = "",
    ) -> ReferralApplyResult:
        normalized_code = cls.normalize_referral_code(referral_code)
        if not normalized_code:
            return ReferralApplyResult(applied=False)

        if user.referred_by_id:
            return ReferralApplyResult(applied=False, message="Реферальный код уже был применён к этому аккаунту.")

        cls.ensure_user_referral_code(user)
        if user.referral_code == normalized_code:
            return ReferralApplyResult(applied=False, message="Нельзя применить собственный реферальный код.")

        inviter = User.objects.filter(referral_code=normalized_code).first()
        if not inviter:
            return ReferralApplyResult(applied=False, message="Реферальный код не найден.")

        user.referred_by = inviter
        user.referred_at = timezone.now()
        user.referral_source = (source or "").strip()[:32]
        user.save(update_fields=["referred_by", "referred_at", "referral_source"])
        return ReferralApplyResult(applied=True, message=f"Реферальный код применён. Вас пригласил {inviter.fullname}.")

    @classmethod
    def get_referral_summary(
        cls,
        user: User,
        *,
        site_url: str | None = None,
        bot_username: str | None = None,
    ) -> dict:
        code = cls.ensure_user_referral_code(user)
        site_base = (site_url or getattr(settings, "WEB_APP_URL", "") or "https://bentum.ru").rstrip("/")
        env_bot_username = cls.resolve_bot_username(bot_username)
        invited_count = user.referred_users.count()

        return {
            "code": code,
            "invited_count": invited_count,
            "site_link": f"{site_base}/?ref={code}",
            "telegram_link": f"https://t.me/{env_bot_username}?start=ref_{code}" if env_bot_username else None,
            "referred_at": user.referred_at.isoformat() if user.referred_at else None,
            "source": user.referral_source or None,
            "referred_by": (
                {
                    "student_code": user.referred_by.student_code,
                    "fullname": user.referred_by.fullname,
                }
                if user.referred_by_id
                else None
            ),
        }
