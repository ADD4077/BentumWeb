import asyncio
import logging
from typing import Optional, Dict, Any, Tuple
from aiogram import Bot, types
from aiogram.exceptions import TelegramAPIError, TelegramNetworkError
from django.conf import settings

logger = logging.getLogger(__name__)

class TelegramService:
    """Сервис для отправки сообщений в Telegram через aiogram"""
    
    def __init__(self):
        self.bot_token = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
        self.chat_id = getattr(settings, 'TELEGRAM_CHAT_ID', None)
        self.topic_id = getattr(settings, 'TELEGRAM_TOPIC_ID', 9)  # ID темы для заявок поддержки
        self.bot = None
        
        if self.bot_token:
            self.bot = Bot(token=self.bot_token)
    
    async def send_support_request(self, user_data: Dict[str, Any], message: str, request_type: str = 'support') -> bool:
        """Отправка заявки в поддержку"""
        
        if not self.bot or not self.chat_id:
            logger.error("Telegram bot token or chat ID not configured")
            return False
        
        try:
            # Формируем сообщение
            formatted_message = self._format_support_message(user_data, message, request_type)
            
            # Отправляем сообщение в тему
            await self.bot.send_message(
                chat_id=self.chat_id,
                text=formatted_message,
                parse_mode='HTML',
                disable_web_page_preview=True,
                message_thread_id=self.topic_id
            )
            
            logger.info(f"Support request sent successfully for user {user_data.get('student_code', 'unknown')}")
            return True
                
        except TelegramAPIError as e:
            logger.error(f"Telegram API error sending message: {e}")
            return False
        except TelegramNetworkError as e:
            logger.error(f"Network error sending Telegram message: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending Telegram message: {e}")
            return False
    
    def send_support_request_sync(self, user_data: Dict[str, Any], message: str, request_type: str = 'support') -> bool:
        """Синхронная обертка для отправки заявки в поддержку"""
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        return loop.run_until_complete(self.send_support_request(user_data, message, request_type))
    
    def _format_support_message(self, user_data: Dict[str, Any], message: str, request_type: str) -> str:
        """Форматирует сообщение для отправки в Telegram"""
        
        # Определяем эмодзи и заголовок в зависимости от типа
        emoji_map = {
            'support': '🆘',
            'bug': '🐛',
            'feature': '💡',
            'question': '❓'
        }
        
        emoji = emoji_map.get(request_type, '📝')
        title_map = {
            'support': 'Новая заявка в поддержку',
            'bug': 'Сообщение об ошибке',
            'feature': 'Предложение по улучшению',
            'question': 'Вопрос от пользователя'
        }
        
        title = title_map.get(request_type, 'Новое сообщение')
        
        # Формируем сообщение
        formatted_message = f"""
{emoji} <b>{title}</b>

👤 <b>Пользователь:</b>
• Имя: {user_data.get('fullname', 'Не указано')}
• Группа: {user_data.get('student_code', 'Не указана')}
• Факультет: {user_data.get('faculty', 'Не указан')}

📝 <b>Сообщение:</b>
{message}

⏰ <b>Время:</b> {user_data.get('created_at', 'Текущее время')}
        """.strip()
        
        return formatted_message
    
    async def test_connection(self) -> Tuple[bool, str]:
        """Проверка соединения с Telegram API"""
        if not self.bot:
            return False, "Bot token not configured"
        
        try:
            # Проверяем информацию о боте
            bot_info = await self.bot.get_me()
            message = f"Connected to bot: @{bot_info.username}"
            
            # Проверяем возможность отправки в тему
            if self.chat_id and self.topic_id:
                try:
                    await self.bot.send_message(
                        chat_id=self.chat_id,
                        text='🧪 Test message - Bot connection successful',
                        message_thread_id=self.topic_id
                    )
                    message += f"\n✅ Topic {self.topic_id} - OK"
                except Exception as e:
                    message += f"\n❌ Topic {self.topic_id} - Error: {str(e)}"
            
            return True, message
                
        except TelegramAPIError as e:
            return False, f"Telegram API error: {e}"
        except TelegramNetworkError as e:
            return False, f"Network error: {e}"
        except Exception as e:
            return False, f"Connection error: {str(e)}"
    
    def test_connection_sync(self) -> Tuple[bool, str]:
        """Синхронная обертка для проверки соединения"""
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        return loop.run_until_complete(self.test_connection())

# Глобальный экземпляр сервиса
telegram_service = TelegramService()
