import asyncio
import logging
import secrets
from typing import Any, Dict, Optional, Tuple

from aiogram import Bot
from django.conf import settings
from django.utils import timezone

from .models import TelegramBinding, User

logger = logging.getLogger(__name__)


class TelegramBindingService:
    """Сервис для управления привязкой Telegram-аккаунтов к пользователям."""

    def __init__(self):
        self.bot_token = getattr(settings, "TELEGRAM_BOT_TOKEN", None)
        self.bot_username = getattr(settings, "TELEGRAM_BOT_USERNAME", None)
        self._bot = None

    async def _get_bot(self) -> Bot:
        """Получить экземпляр бота и при необходимости определить username."""
        if not self._bot and self.bot_token:
            self._bot = Bot(token=self.bot_token)

            if not self.bot_username:
                try:
                    bot_info = await self._bot.get_me()
                    self.bot_username = bot_info.username
                    logger.info("Auto-detected bot username: @%s", self.bot_username)
                except Exception as error:
                    logger.error("Failed to get bot username: %s", error)
                    raise ValueError(
                        "Could not determine bot username. Please set TELEGRAM_BOT_USERNAME in settings."
                    )

        return self._bot

    def generate_binding_token(self, user: User) -> str:
        """Сгенерировать токен для привязки Telegram."""
        try:
            TelegramBinding.objects.filter(user=user, is_active=False).delete()
            token = secrets.token_urlsafe(32)

            TelegramBinding.objects.update_or_create(
                user=user,
                defaults={
                    "binding_token": token,
                    "is_active": False,
                    "telegram_id": 0,
                    "telegram_username": None,
                    "telegram_first_name": None,
                    "telegram_last_name": None,
                },
            )

            logger.info("Generated binding token for user %s: %s", user.student_code, token)
            return token
        except Exception as error:
            logger.error("Error generating binding token for user %s: %s", user.student_code, error)
            raise

    async def generate_binding_token_async(self, user: User) -> str:
        """Асинхронная генерация токена для привязки Telegram."""
        try:
            from asgiref.sync import sync_to_async

            @sync_to_async
            def delete_existing_tokens():
                return TelegramBinding.objects.filter(user=user, is_active=False).delete()

            @sync_to_async
            def create_or_update_binding(token):
                return TelegramBinding.objects.update_or_create(
                    user=user,
                    defaults={
                        "binding_token": token,
                        "is_active": False,
                        "telegram_id": 0,
                        "telegram_username": None,
                        "telegram_first_name": None,
                        "telegram_last_name": None,
                    },
                )

            await delete_existing_tokens()
            token = secrets.token_urlsafe(32)
            await create_or_update_binding(token)

            logger.info("Generated binding token for user %s: %s", user.student_code, token)
            return token
        except Exception as error:
            logger.error("Error generating binding token for user %s: %s", user.student_code, error)
            raise

    async def get_binding_link(self, token: str) -> str:
        """Сгенерировать ссылку для привязки Telegram."""
        await self._get_bot()

        if not self.bot_username:
            raise ValueError("Bot username not available")

        return f"https://t.me/{self.bot_username}?start={token}"

    def get_binding_link_sync(self, token: str) -> str:
        """Синхронная обертка для генерации ссылки."""
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        return loop.run_until_complete(self.get_binding_link(token))

    async def bind_telegram_account(self, token: str, telegram_data: Dict[str, Any]) -> Tuple[bool, str]:
        """Привязать Telegram-аккаунт к пользователю по токену."""
        try:
            from asgiref.sync import sync_to_async

            @sync_to_async
            def get_binding_by_token():
                return TelegramBinding.objects.filter(binding_token=token, is_active=False).first()

            @sync_to_async
            def get_existing_binding(telegram_id):
                return (
                    TelegramBinding.objects.filter(telegram_id=telegram_id, is_active=True)
                    .exclude(telegram_id=0)
                    .first()
                )

            @sync_to_async
            def update_binding(binding, payload):
                binding.telegram_id = payload["id"]
                binding.telegram_username = payload.get("username")
                binding.telegram_first_name = payload.get("first_name")
                binding.telegram_last_name = payload.get("last_name")
                binding.is_active = True
                binding.updated_at = timezone.now()
                binding.save()
                return binding

            @sync_to_async
            def get_user(binding):
                return binding.user

            binding = await get_binding_by_token()
            if not binding:
                return False, "Неверный или истекший токен привязки"

            existing_binding = await get_existing_binding(telegram_data["id"])
            if existing_binding:
                return False, "Этот Telegram аккаунт уже привязан к другому пользователю"

            await update_binding(binding, telegram_data)
            user = await get_user(binding)

            logger.info(
                "Successfully bound Telegram @%s to user %s",
                telegram_data.get("username", telegram_data["id"]),
                user.student_code,
            )
            return True, f"Telegram аккаунт успешно привязан к {user.fullname}"
        except Exception as error:
            logger.error("Error binding Telegram account with token %s: %s", token, error)
            return False, "Внутренняя ошибка сервера"

    def bind_telegram_account_sync(self, token: str, telegram_data: Dict[str, Any]) -> Tuple[bool, str]:
        """Синхронная обертка для привязки аккаунта."""
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        return loop.run_until_complete(self.bind_telegram_account(token, telegram_data))

    def get_user_binding(self, user: User) -> Optional[TelegramBinding]:
        """Получить информацию о привязке Telegram для пользователя."""
        try:
            return TelegramBinding.objects.filter(user=user, is_active=True).first()
        except Exception as error:
            logger.error("Error getting Telegram binding for user %s: %s", user.student_code, error)
            return None

    async def get_user_binding_async(self, user: User) -> Optional[TelegramBinding]:
        """Асинхронная версия получения информации о привязке."""
        try:
            from asgiref.sync import sync_to_async

            @sync_to_async
            def get_binding():
                return TelegramBinding.objects.filter(user=user, is_active=True).first()

            return await get_binding()
        except Exception as error:
            logger.error("Error getting Telegram binding for user %s: %s", user.student_code, error)
            return None

    def unlink_telegram_account(self, user: User) -> Tuple[bool, str]:
        """Отвязать Telegram-аккаунт от пользователя."""
        try:
            binding = TelegramBinding.objects.filter(user=user, is_active=True).first()
            if not binding:
                return False, "Привязанный Telegram аккаунт не найден"

            binding.is_active = False
            binding.updated_at = timezone.now()
            binding.save()

            logger.info("Unlinked Telegram account from user %s", user.student_code)
            return True, "Telegram аккаунт успешно отвязан"
        except Exception as error:
            logger.error("Error unlinking Telegram account for user %s: %s", user.student_code, error)
            return False, "Внутренняя ошибка сервера"

    async def unlink_telegram_account_async(self, user: User) -> Tuple[bool, str]:
        """Асинхронная версия отвязки аккаунта."""
        try:
            from asgiref.sync import sync_to_async

            @sync_to_async
            def get_binding():
                return TelegramBinding.objects.filter(user=user, is_active=True).first()

            @sync_to_async
            def update_binding(binding):
                binding.is_active = False
                binding.updated_at = timezone.now()
                binding.save()

            binding = await get_binding()
            if not binding:
                return False, "Привязанный Telegram аккаунт не найден"

            await update_binding(binding)

            logger.info("Unlinked Telegram account from user %s", user.student_code)
            return True, "Telegram аккаунт успешно отвязан"
        except Exception as error:
            logger.error("Error unlinking Telegram account for user %s: %s", user.student_code, error)
            return False, "Внутренняя ошибка сервера"

    def get_user_by_telegram_id(self, telegram_id: int) -> Optional[User]:
        """Получить пользователя по Telegram ID."""
        try:
            binding = (
                TelegramBinding.objects.filter(telegram_id=telegram_id, is_active=True)
                .exclude(telegram_id=0)
                .first()
            )
            return binding.user if binding else None
        except Exception as error:
            logger.error("Error getting user by Telegram ID %s: %s", telegram_id, error)
            return None

    async def get_user_by_telegram_id_async(self, telegram_id: int) -> Optional[User]:
        """Асинхронная версия получения пользователя по Telegram ID."""
        try:
            from asgiref.sync import sync_to_async

            @sync_to_async
            def get_binding():
                return (
                    TelegramBinding.objects.filter(telegram_id=telegram_id, is_active=True)
                    .exclude(telegram_id=0)
                    .first()
                )

            @sync_to_async
            def get_user(binding):
                return binding.user if binding else None

            binding = await get_binding()
            return await get_user(binding)
        except Exception as error:
            logger.error("Error getting user by Telegram ID %s: %s", telegram_id, error)
            return None

    def cleanup_expired_tokens(self):
        """Очистить просроченные токены привязки старше 24 часов."""
        try:
            from datetime import timedelta

            cutoff_time = timezone.now() - timedelta(hours=24)
            expired_count = TelegramBinding.objects.filter(
                is_active=False,
                created_at__lt=cutoff_time,
            ).delete()[0]

            if expired_count > 0:
                logger.info("Cleaned up %s expired binding tokens", expired_count)
        except Exception as error:
            logger.error("Error cleaning up expired binding tokens: %s", error)


telegram_binding_service = TelegramBindingService()
