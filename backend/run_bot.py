#!/usr/bin/env python3
"""
Standalone Telegram bot without Django dependencies.
"""
import asyncio
import logging
import os
import sys
from typing import Optional

sys.path.append('/app')

try:
    from aiogram import Bot, Dispatcher, types
    from aiogram.filters import CommandStart
    from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message, WebAppInfo
except ImportError as error:
    print(f"Error importing aiogram: {error}")
    sys.exit(1)

try:
    import aiohttp
except ImportError as error:
    print(f"Error importing aiohttp: {error}")
    sys.exit(1)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
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
        internal_token = os.environ.get("TELEGRAM_INTERNAL_API_TOKEN", "")
        payload = {
            "token": token,
            "telegram": {
                "id": telegram_user.id,
                "username": telegram_user.username,
                "first_name": telegram_user.first_name,
                "last_name": telegram_user.last_name,
            },
        }

        timeout = aiohttp.ClientTimeout(total=15)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            headers = {}
            if internal_token:
                headers["X-Internal-Token"] = internal_token

            async with session.post(url, json=payload, headers=headers) as response:
                try:
                    data = await response.json()
                except Exception:
                    text = await response.text()
                    return False, f"Backend returned non-JSON ({response.status}): {text[:200]}"

                if response.status == 200 and data.get('success'):
                    message = (data.get('data') or {}).get('message') or 'Linked'
                    return True, message

                detail = data.get('detail') or str(data)
                return False, f"{response.status}: {detail}"

    def _setup_handlers(self):
        @self.dp.message(CommandStart())
        async def handle_start(message: Message):
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

            web_app_url = os.environ.get('WEB_APP_URL', 'https://bentum.ru')
            welcome_text = (
                "👋 **Добро пожаловать в бот образовательной платформы Bentum!**\n\n"
                "📚 **Что я могу делать:**\n"
                "• Привязывать ваш аккаунт к профилю на сайте\n"
                "• Отправлять важные уведомления\n\n"
                "🚀 **Быстрый доступ:**\n"
                "Нажмите «Открыть приложение», чтобы запустить сайт прямо в Telegram.\n\n"
                "💡 **Как привязать аккаунт:**\n"
                "1. Зайдите в настройки профиля на сайте\n"
                "2. Нажмите «Привязать Telegram»\n"
                "3. Перейдите по сгенерированной ссылке\n\n"
                "📝 Поддержка доступна на сайте внутри Bentum."
            )

            await message.answer(
                welcome_text,
                parse_mode="Markdown",
                reply_markup=InlineKeyboardMarkup(
                    inline_keyboard=[
                        [
                            InlineKeyboardButton(
                                text="🚀 Открыть приложение",
                                web_app=WebAppInfo(url=web_app_url),
                            )
                        ],
                        [InlineKeyboardButton(text="🌐 Перейти на сайт", url=web_app_url)],
                    ]
                ),
            )

    async def start(self):
        if not self.bot_token:
            logger.error("Bot token not configured")
            return

        try:
            bot_info = await self.bot.get_me()
            logger.info("CLEAN bot started: @%s", bot_info.username)
            await self.dp.start_polling(self.bot)
        except Exception as error:
            logger.error("Error starting clean bot: %s", error)


async def main():
    logger.info("Starting CLEAN Telegram bot - NO Django!")
    bot = CleanBot()
    await bot.start()


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Clean bot stopped by user")
    except Exception as error:
        logger.error("Clean bot crashed: %s", error)
