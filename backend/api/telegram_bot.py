import asyncio
import logging
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import CommandStart
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton
from django.conf import settings
from django.core.management import execute_from_command_line
import os
import sys

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TelegramBot:
    def __init__(self):
        self.bot_token = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
        self.support_chat_id = getattr(settings, 'TELEGRAM_CHAT_ID', None)
        self.support_topic_id = getattr(settings, 'TELEGRAM_TOPIC_ID', 9)
        
        if not self.bot_token:
            logger.error("TELEGRAM_BOT_TOKEN not configured")
            return
        
        self.bot = Bot(token=self.bot_token)
        self.dp = Dispatcher()
        self._setup_handlers()
    
    def _setup_handlers(self):
        """Настройка обработчиков команд"""
        
        @self.dp.message(CommandStart())
        async def handle_start(message: Message):
            """Обработка команды /start"""
            args = message.text.split()[1:] if len(message.text.split()) > 1 else []
            
            if args:
                # Если есть аргументы, это привязка аккаунта
                await self._handle_binding(message, args[0])
            else:
                # Обычное приветствие
                await self._handle_welcome(message)
        
        @self.dp.message(F.text)
        async def handle_text(message: Message):
            """Обработка текстовых сообщений"""
            # Если это не команда, отправляем в поддержку
            if not message.text.startswith('/'):
                await self._send_to_support(message)
        
        @self.dp.message()
        async def handle_other(message: Message):
            """Обработка других типов сообщений"""
            await self._send_to_support(message)
    
    async def _handle_binding(self, message: Message, token: str):
        """Обработка привязки аккаунта"""
        try:
            from .telegram_binding_service import telegram_binding_service
            
            # Получаем данные пользователя из Telegram
            telegram_data = {
                'id': message.from_user.id,
                'username': message.from_user.username,
                'first_name': message.from_user.first_name,
                'last_name': message.from_user.last_name,
            }
            
            # Привязываем аккаунт (используем асинхронную версию)
            success, result_message = await telegram_binding_service.bind_telegram_account(token, telegram_data)
            
            if success:
                await message.answer(
                    f"✅ **Аккаунт успешно привязан!**\n\n"
                    f"Ваш Telegram аккаунт теперь связан с профилем на сайте.\n"
                    f"Вы будете получать уведомления о важных событиях.",
                    parse_mode="Markdown"
                )
            else:
                await message.answer(
                    f"❌ **Ошибка привязки**\n\n"
                    f"{result_message}\n\n"
                    f"Пожалуйста, попробуйте снова или обратитесь в поддержку.",
                    parse_mode="Markdown"
                )
                
        except Exception as e:
            logger.error(f"Error handling binding: {e}")
            await message.answer(
                "❌ **Произошла ошибка при привязке аккаунта**\n\n"
                "Пожалуйста, попробуйте позже или обратитесь в поддержку.",
                parse_mode="Markdown"
            )
    
    async def _handle_welcome(self, message: Message):
        """Обработка обычного приветствия"""
        welcome_text = (
            "👋 **Добро пожаловать в бот образовательной платформы Бентум!**\n\n"
            "📚 **Что я могу делать:**\n"
            "• Пересылать ваши сообщения в службу поддержки\n"
            "• Привязывать ваш аккаунт к профилю на сайте\n"
            "• Отправлять важные уведомления\n\n"
            "💡 **Как привязать аккаунт:**\n"
            "1. Зайдите в настройки профиля на сайте\n"
            "2. Нажмите 'Привязать Telegram'\n"
            "3. Перейдите по сгенерированной ссылке\n\n"
            "📝 **Для связи с поддержкой** просто отправьте мне сообщение!"
        )
        
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="🌐 Перейти на сайт", url="https://bentum.edu.by")],
            [InlineKeyboardButton(text="📖 Помощь", callback_data="help")]
        ])
        
        await message.answer(welcome_text, parse_mode="Markdown", reply_markup=keyboard)
    
    async def _send_to_support(self, message: Message):
        """Отправка сообщения в поддержку"""
        try:
            if not self.support_chat_id:
                await message.answer("❌ Служба поддержки недоступна")
                return
            
            # Формируем текст для поддержки
            user_info = f"👤 **Пользователь:** @{message.from_user.username or 'N/A'}\n"
            user_info += f"🆔 **ID:** `{message.from_user.id}`\n"
            user_info += f"📝 **Имя:** {message.from_user.first_name or 'N/A'} {message.from_user.last_name or ''}\n\n"
            
            support_text = user_info + f"💬 **Сообщение:**\n{message.text or 'Медиа файл'}"
            
            # Отправляем в тему поддержки
            await self.bot.send_message(
                chat_id=self.support_chat_id,
                text=support_text,
                parse_mode="Markdown",
                message_thread_id=self.support_topic_id
            )
            
            # Подтверждение пользователю
            await message.answer(
                "✅ **Сообщение отправлено в поддержку**\n\n"
                "Мы свяжемся с вами в ближайшее время.",
                parse_mode="Markdown"
            )
            
        except Exception as e:
            logger.error(f"Error sending to support: {e}")
            await message.answer("❌ Не удалось отправить сообщение. Попробуйте позже.")
    
    async def start(self):
        """Запуск бота"""
        if not self.bot_token:
            logger.error("Bot token not configured")
            return
        
        try:
            # Получаем информацию о боте
            bot_info = await self.bot.get_me()
            logger.info(f"Bot started: @{bot_info.username}")
            
            # Запускаем polling
            await self.dp.start_polling(self.bot)
            
        except Exception as e:
            logger.error(f"Error starting bot: {e}")

def setup_django():
    """Setup Django without system checks"""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    
    # Disable Django system checks to avoid duplication with server
    os.environ.setdefault('DJANGO_CHECKS', '[]')
    
    # Add Django project path
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    try:
        import django
        # Disable system checks to avoid duplication with server
        django.setup()
    except Exception as e:
        logger.error(f"Error setting up Django: {e}")
        sys.exit(1)

async def main():
    """Главная функция"""
    # Настраиваем Django
    setup_django()
    
    # Создаем и запускаем бота
    bot = TelegramBot()
    await bot.start()

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Bot stopped by user")
    except Exception as e:
        logger.error(f"Bot crashed: {e}")
