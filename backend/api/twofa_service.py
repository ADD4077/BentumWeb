import secrets
import logging
from datetime import timedelta
from typing import Optional, Dict, Any, Tuple
from django.utils import timezone
from django.core.cache import cache
from django.conf import settings
from aiogram import Bot
from asgiref.sync import sync_to_async
from .models import User, TelegramBinding

logger = logging.getLogger(__name__)

class TwoFAService:
    """Сервис для управления двухфакторной аутентификацией"""
    
    def __init__(self):
        self.bot_token = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
        self._bot = None
    
    async def _get_bot(self) -> Bot:
        """Получает экземпляр бота"""
        if not self._bot and self.bot_token:
            self._bot = Bot(token=self.bot_token)
        return self._bot
    
    def generate_6fa_code(self) -> str:
        """Генерирует 6-значный код"""
        return ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    
    def store_2fa_code(self, student_code: str, code: str, ttl_minutes: int = 5) -> None:
        """Сохраняет 2FA код в кэш с TTL"""
        cache_key = f"2fa_code:{student_code}"
        cache.set(cache_key, code, ttl_minutes * 60)
        logger.info(f"Stored 2FA code for user {student_code}")
    
    def verify_2fa_code(self, student_code: str, code: str) -> bool:
        """Проверяет 2FA код"""
        cache_key = f"2fa_code:{student_code}"
        stored_code = cache.get(cache_key)
        
        if stored_code and stored_code == code:
            cache.delete(cache_key)  # Удаляем код после успешной проверки
            logger.info(f"Successfully verified 2FA code for user {student_code}")
            return True
        
        logger.warning(f"Failed 2FA verification for user {student_code}")
        return False
    
    async def send_2fa_code_telegram(self, user: User, code: str) -> Tuple[bool, str]:
        """Отправляет 2FA код в Telegram"""
        try:
            # Проверяем привязку Telegram
            binding = TelegramBinding.objects.filter(user=user, is_active=True).first()
            if not binding or binding.telegram_id == 0:
                return False, "Telegram аккаунт не привязан"
            
            bot = await self._get_bot()
            if not bot:
                return False, "Бот недоступен"
            
            message = (
                f"🔐 *Код подтверждения Бентум*\n\n"
                f"Ваш 6-значный код: `{code}`\n\n"
                f"Код действителен 5 минут.\n\n"
                f"_Если это не вы, проигнорируйте сообщение._"
            )
            
            await bot.send_message(
                chat_id=binding.telegram_id,
                text=message,
                parse_mode='Markdown'
            )
            
            logger.info(f"Sent 2FA code to Telegram for user {user.student_code}")
            return True, "Код отправлен в Telegram"
            
        except Exception as e:
            logger.error(f"Error sending 2FA code to Telegram for user {user.student_code}: {e}")
            return False, "Ошибка отправки кода"
    
    def send_2fa_code_telegram_sync(self, user: User, code: str) -> Tuple[bool, str]:
        """Синхронная обертка для отправки кода"""
        try:
            import asyncio
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        return loop.run_until_complete(self.send_2fa_code_telegram(user, code))
    
    def is_2fa_required(self, user: User) -> bool:
        """Проверяет, требуется ли 2FA для пользователя"""
        return bool(user.twofa_enabled and user.twofa_method)
    
    def get_user_2fa_config(self, user: User) -> Dict[str, Any]:
        """Возвращает конфигурацию 2FA пользователя"""
        return {
            "enabled": user.twofa_enabled,
            "method": user.twofa_method,
            "telegram_linked": bool(TelegramBinding.objects.filter(user=user, is_active=True, telegram_id__gt=0).exists())
        }
    
    def set_user_2fa_config(self, user: User, enabled: bool, method: str) -> Tuple[bool, str]:
        """Устанавливает конфигурацию 2FA для пользователя"""
        try:
            # Проверяем, что метод поддерживается
            if enabled and method not in ['telegram']:
                return False, "Неподдерживаемый метод 2FA"
            
            # Проверяем, что для метода есть привязка
            if enabled and method == 'telegram':
                if not TelegramBinding.objects.filter(user=user, is_active=True, telegram_id__gt=0).exists():
                    return False, "Сначала привяжите Telegram аккаунт"
            
            user.twofa_enabled = enabled
            user.twofa_method = method if enabled else None
            user.save()
            
            logger.info(f"Updated 2FA config for user {user.student_code}: enabled={enabled}, method={method}")
            return True, "Настройки 2FA обновлены"
            
        except Exception as e:
            logger.error(f"Error updating 2FA config for user {user.student_code}: {e}")
            return False, "Ошибка обновления настроек"

# Глобальный экземпляр сервиса
twofa_service = TwoFAService()
