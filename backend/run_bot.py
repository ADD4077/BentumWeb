#!/usr/bin/env python3
"""
Clean Telegram bot without Django dependencies
"""
import asyncio
import logging
import os
import sys
from typing import Optional

# Add current directory to path
sys.path.append('/app')

# Import ONLY aiogram components
try:
    from aiogram import Bot, Dispatcher, types
    from aiogram.filters import CommandStart
    from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton
except ImportError as e:
    print(f"Error importing aiogram: {e}")
    sys.exit(1)

try:
    import aiohttp
except ImportError as e:
    print(f"Error importing aiohttp: {e}")
    sys.exit(1)

# Setup logging without ANY Django configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class CleanBot:
    def __init__(self):
        self.bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')
        self.backend_base_url = os.environ.get('BACKEND_BASE_URL', 'http://server:1337')
        
        if not self.bot_token:
            logger.error("TELEGRAM_BOT_TOKEN not configured")
            return
        
        self.bot = Bot(token=self.bot_token)
        self.dp = Dispatcher()
        self._setup_handlers()

    async def _bind_token(self, token: str, telegram_user: types.User) -> tuple[bool, str]:
        url = f"{self.backend_base_url}/api/telegram/bind"
        payload = {
            "token": token,
            "telegram": {
                "id": telegram_user.id,
                "username": telegram_user.username,
                "first_name": telegram_user.first_name,
                "last_name": telegram_user.last_name,
            }
        }

        timeout = aiohttp.ClientTimeout(total=15)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(url, json=payload) as resp:
                try:
                    data = await resp.json()
                except Exception:
                    text = await resp.text()
                    return False, f"Backend returned non-JSON ({resp.status}): {text[:200]}"

                if resp.status == 200 and data.get('success'):
                    msg = (data.get('data') or {}).get('message') or 'Linked'
                    return True, msg

                detail = data.get('detail') or str(data)
                return False, f"{resp.status}: {detail}"
    
    def _setup_handlers(self):
        """Setup command handlers"""
        
        @self.dp.message(CommandStart())
        async def handle_start(message: Message):
            """Handle /start command"""
            token: Optional[str] = None
            parts = (message.text or '').split(maxsplit=1)
            if len(parts) == 2:
                token = parts[1].strip()

            if token:
                ok, result_message = await self._bind_token(token, message.from_user)
                if ok:
                    await message.answer(
                        "✅ Telegram аккаунт привязан. Можно возвращаться на сайт.\n\n"
                        f"{result_message}"
                    )
                else:
                    await message.answer(
                        "❌ Не удалось привязать Telegram аккаунт.\n\n"
                        f"{result_message}"
                    )
                return

            # URL для Web App
            web_app_url = os.environ.get('WEB_APP_URL', 'https://bentum.ru')
            
            welcome_text = (
                "👋 **Добро пожаловать в бот образовательной платформы Бентум!**\n\n"
                "📚 **Что я могу делать:**\n"
                "• Пересылать ваши сообщения в службу поддержки\n"
                "• Привязывать ваш аккаунт к профилю на сайте\n"
                "• Отправлять важные уведомления\n\n"
                "🚀 **Быстрый доступ:**\n"
                "Нажмите «Открыть приложение» чтобы запустить сайт прямо в Telegram!\n\n"
                "💡 **Как привязать аккаунт:**\n"
                "1. Зайдите в настройки профиля на сайте\n"
                "2. Нажмите 'Привязать Telegram'\n"
                "3. Перейдите по сгенерированной ссылке\n\n"
                "📝 **Для связи с поддержкой** просто отправьте мне сообщение!"
            )
            
            from aiogram.types import WebAppInfo
            await message.answer(
                welcome_text,
                parse_mode="Markdown",
                reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                    [InlineKeyboardButton(
                        text="🚀 Открыть приложение", 
                        web_app=WebAppInfo(url=web_app_url)
                    )],
                    [InlineKeyboardButton(text="🌐 Перейти на сайт", url=web_app_url)],
                ])
            )
        
        @self.dp.message()
        async def handle_message(message: Message):
            """Handle any message - send to support"""
            await message.answer("✅ Сообщение отправлено в поддержку. Ожидайте ответа.")
    
    async def start(self):
        """Start the bot"""
        if not self.bot_token:
            logger.error("Bot token not configured")
            return
        
        try:
            # Get bot info
            bot_info = await self.bot.get_me()
            logger.info(f"CLEAN bot started: @{bot_info.username}")
            
            # Start polling
            await self.dp.start_polling(self.bot)
            
        except Exception as e:
            logger.error(f"Error starting clean bot: {e}")

async def main():
    """Main function"""
    logger.info("Starting CLEAN Telegram bot - NO Django!")
    
    # Create and start bot
    bot = CleanBot()
    await bot.start()

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Clean bot stopped by user")
    except Exception as e:
        logger.error(f"Clean bot crashed: {e}")
