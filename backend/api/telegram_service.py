import asyncio
import logging
from typing import Any, Dict, Tuple

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError, TelegramNetworkError
from django.conf import settings

logger = logging.getLogger(__name__)


class TelegramService:
    """Сервис для отправки сообщений в Telegram через aiogram."""

    def __init__(self):
        self.bot_token = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
        self.chat_id = getattr(settings, 'TELEGRAM_CHAT_ID', None)
        self.topic_id = getattr(settings, 'TELEGRAM_TOPIC_ID', 9)

    def _create_bot(self):
        if not self.bot_token:
            return None
        return Bot(token=self.bot_token)

    async def send_support_request(
        self,
        user_data: Dict[str, Any],
        message: str,
        request_type: str = 'support',
    ) -> bool:
        """Отправка заявки в поддержку."""
        if not self.bot_token or not self.chat_id:
            logger.error("Telegram bot token or chat ID not configured")
            return False

        bot = self._create_bot()
        if not bot:
            logger.error("Telegram bot instance was not created")
            return False

        try:
            formatted_message = self._format_support_message(user_data, message, request_type)
            await bot.send_message(
                chat_id=self.chat_id,
                text=formatted_message,
                parse_mode='HTML',
                disable_web_page_preview=True,
                message_thread_id=self.topic_id,
            )

            logger.info(
                "Support request sent successfully for user %s",
                user_data.get('student_code', 'unknown'),
            )
            return True
        except TelegramAPIError as exc:
            logger.error("Telegram API error sending message: %s", exc)
            return False
        except TelegramNetworkError as exc:
            logger.error("Network error sending Telegram message: %s", exc)
            return False
        except Exception as exc:
            logger.error("Unexpected error sending Telegram message: %s", exc)
            return False
        finally:
            await bot.session.close()

    def send_support_request_sync(
        self,
        user_data: Dict[str, Any],
        message: str,
        request_type: str = 'support',
    ) -> bool:
        """Синхронная обёртка для отправки заявки в поддержку."""
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        return loop.run_until_complete(self.send_support_request(user_data, message, request_type))

    def _format_support_message(self, user_data: Dict[str, Any], message: str, request_type: str) -> str:
        emoji_map = {
            'support': '🆘',
            'bug': '🐛',
            'feature': '💡',
            'question': '❓',
        }

        title_map = {
            'support': 'Новая заявка в поддержку',
            'bug': 'Сообщение об ошибке',
            'feature': 'Предложение по улучшению',
            'question': 'Вопрос от пользователя',
        }

        emoji = emoji_map.get(request_type, '📝')
        title = title_map.get(request_type, 'Новое сообщение')

        return f"""
{emoji} <b>{title}</b>

👤 <b>Пользователь:</b>
• Имя: {user_data.get('fullname', 'Не указано')}
• Группа: {user_data.get('student_code', 'Не указана')}
• Факультет: {user_data.get('faculty', 'Не указан')}

📝 <b>Сообщение:</b>
{message}

⏰ <b>Время:</b> {user_data.get('created_at', 'Текущее время')}
        """.strip()

    async def test_connection(self) -> Tuple[bool, str]:
        """Проверка соединения с Telegram API."""
        if not self.bot_token:
            return False, "Bot token not configured"

        bot = self._create_bot()
        if not bot:
            return False, "Bot instance not created"

        try:
            bot_info = await bot.get_me()
            message = f"Connected to bot: @{bot_info.username}"

            if self.chat_id and self.topic_id:
                try:
                    await bot.send_message(
                        chat_id=self.chat_id,
                        text='🧪 Test message - Bot connection successful',
                        message_thread_id=self.topic_id,
                    )
                    message += f"\n✅ Topic {self.topic_id} - OK"
                except Exception as exc:
                    message += f"\n❌ Topic {self.topic_id} - Error: {exc}"

            return True, message
        except TelegramAPIError as exc:
            return False, f"Telegram API error: {exc}"
        except TelegramNetworkError as exc:
            return False, f"Network error: {exc}"
        except Exception as exc:
            return False, f"Connection error: {exc}"
        finally:
            await bot.session.close()

    def test_connection_sync(self) -> Tuple[bool, str]:
        """Синхронная обёртка для проверки соединения."""
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        return loop.run_until_complete(self.test_connection())
