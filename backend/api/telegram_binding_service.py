import secrets
import asyncio
import logging
from typing import Optional, Dict, Any, Tuple
from django.utils import timezone
from django.conf import settings
from aiogram import Bot
from asgiref.sync import sync_to_async
from .models import User, TelegramBinding

logger = logging.getLogger(__name__)

class TelegramBindingService:
    """Сервис для управления привязкой Telegram аккаунтов к пользователям"""
    
    def __init__(self):
        self.bot_token = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
        self.bot_username = getattr(settings, 'TELEGRAM_BOT_USERNAME', None)
        self._bot = None
    
    async def _get_bot(self) -> Bot:
        """Получает экземпляр бота и кэширует username"""
        if not self._bot and self.bot_token:
            self._bot = Bot(token=self.bot_token)
            
            # Если username не настроен в settings, получаем его автоматически
            if not self.bot_username:
                try:
                    bot_info = await self._bot.get_me()
                    self.bot_username = bot_info.username
                    logger.info(f"Auto-detected bot username: @{self.bot_username}")
                except Exception as e:
                    logger.error(f"Failed to get bot username: {e}")
                    raise ValueError("Could not determine bot username. Please set TELEGRAM_BOT_USERNAME in settings.")
        
        return self._bot
    
    def generate_binding_token(self, user: User) -> str:
        """Генерирует токен для привязки Telegram"""
        try:
            # Удаляем существующие токены пользователя
            TelegramBinding.objects.filter(user=user, is_active=False).delete()
            
            # Генерируем уникальный токен
            token = secrets.token_urlsafe(32)
            
            # Создаем или обновляем запись о привязке
            binding, created = TelegramBinding.objects.update_or_create(
                user=user,
                defaults={
                    'binding_token': token,
                    'is_active': False,  # Неактивна до подтверждения
                    'telegram_id': 0,  # Временное значение до подтверждения
                    'telegram_username': None,
                    'telegram_first_name': None,
                    'telegram_last_name': None,
                }
            )
            
            logger.info(f"Generated binding token for user {user.student_code}: {token}")
            return token
            
        except Exception as e:
            logger.error(f"Error generating binding token for user {user.student_code}: {e}")
            raise
    
    async def generate_binding_token_async(self, user: User) -> str:
        """Асинхронная генерация токена для привязки Telegram"""
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
                        'binding_token': token,
                        'is_active': False,  # Неактивна до подтверждения
                        'telegram_id': 0,  # Временное значение до подтверждения
                        'telegram_username': None,
                        'telegram_first_name': None,
                        'telegram_last_name': None,
                    }
                )
            
            # Удаляем существующие токены пользователя
            await delete_existing_tokens()
            
            # Генерируем уникальный токен
            token = secrets.token_urlsafe(32)
            
            # Создаем или обновляем запись о привязке
            binding, created = await create_or_update_binding(token)
            
            logger.info(f"Generated binding token for user {user.student_code}: {token}")
            return token
            
        except Exception as e:
            logger.error(f"Error generating binding token for user {user.student_code}: {e}")
            raise
    
    async def get_binding_link(self, token: str) -> str:
        """Генерирует ссылку для привязки Telegram"""
        bot = await self._get_bot()
        
        if not self.bot_username:
            raise ValueError("Bot username not available")
        
        return f"https://t.me/{self.bot_username}?start={token}"
    
    def get_binding_link_sync(self, token: str) -> str:
        """Синхронная обертка для генерации ссылки"""
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        return loop.run_until_complete(self.get_binding_link(token))
    
    async def bind_telegram_account(self, token: str, telegram_data: Dict[str, Any]) -> Tuple[bool, str]:
        """Привязывает Telegram аккаунт к пользователю по токену"""
        try:
            from asgiref.sync import sync_to_async
            
            @sync_to_async
            def get_binding_by_token():
                return TelegramBinding.objects.filter(
                    binding_token=token,
                    is_active=False
                ).first()
            
            @sync_to_async
            def get_existing_binding(telegram_id):
                return TelegramBinding.objects.filter(
                    telegram_id=telegram_id,
                    is_active=True
                ).exclude(telegram_id=0).first()
            
            @sync_to_async
            def update_binding(binding, telegram_data):
                binding.telegram_id = telegram_data['id']
                binding.telegram_username = telegram_data.get('username')
                binding.telegram_first_name = telegram_data.get('first_name')
                binding.telegram_last_name = telegram_data.get('last_name')
                binding.is_active = True
                binding.updated_at = timezone.now()
                binding.save()
                return binding
            
            @sync_to_async
            def get_user(binding):
                return binding.user
            
            # Ищем запись с токеном
            binding = await get_binding_by_token()
            
            if not binding:
                return False, "Invalid or expired binding token"
            
            # Проверяем, что этот Telegram ID уже не привязан
            existing_binding = await get_existing_binding(telegram_data['id'])
            
            if existing_binding:
                return False, "This Telegram account is already linked to another user"
            
            # Обновляем запись привязки
            await update_binding(binding, telegram_data)
            
            # Получаем пользователя для логирования
            user = await get_user(binding)
            
            logger.info(f"Successfully bound Telegram @{telegram_data.get('username', telegram_data['id'])} to user {user.student_code}")
            return True, f"Telegram account successfully linked to {user.fullname}"
            
        except Exception as e:
            logger.error(f"Error binding Telegram account with token {token}: {e}")
            return False, "Internal server error"
    
    def bind_telegram_account_sync(self, token: str, telegram_data: Dict[str, Any]) -> Tuple[bool, str]:
        """Синхронная обертка для привязки аккаунта"""
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        return loop.run_until_complete(self.bind_telegram_account(token, telegram_data))
    
    def get_user_binding(self, user: User) -> Optional[TelegramBinding]:
        """Получает информацию о привязке Telegram для пользователя"""
        try:
            return TelegramBinding.objects.filter(user=user, is_active=True).first()
        except Exception as e:
            logger.error(f"Error getting Telegram binding for user {user.student_code}: {e}")
            return None
    
    async def get_user_binding_async(self, user: User) -> Optional[TelegramBinding]:
        """Асинхронная версия получения информации о привязке"""
        try:
            from asgiref.sync import sync_to_async
            
            @sync_to_async
            def get_binding():
                return TelegramBinding.objects.filter(user=user, is_active=True).first()
            
            return await get_binding()
        except Exception as e:
            logger.error(f"Error getting Telegram binding for user {user.student_code}: {e}")
            return None
    
    def unlink_telegram_account(self, user: User) -> Tuple[bool, str]:
        """Отвязывает Telegram аккаунт от пользователя"""
        try:
            binding = TelegramBinding.objects.filter(user=user, is_active=True).first()
            
            if not binding:
                return False, "No linked Telegram account found"
            
            # Деактивируем привязку
            binding.is_active = False
            binding.updated_at = timezone.now()
            binding.save()
            
            logger.info(f"Unlinked Telegram account from user {user.student_code}")
            return True, "Telegram account successfully unlinked"
            
        except Exception as e:
            logger.error(f"Error unlinking Telegram account for user {user.student_code}: {e}")
            return False, "Internal server error"
    
    async def unlink_telegram_account_async(self, user: User) -> Tuple[bool, str]:
        """Асинхронная версия отвязки аккаунта"""
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
                return False, "No linked Telegram account found"
            
            # Деактивируем привязку
            await update_binding(binding)
            
            logger.info(f"Unlinked Telegram account from user {user.student_code}")
            return True, "Telegram account successfully unlinked"
            
        except Exception as e:
            logger.error(f"Error unlinking Telegram account for user {user.student_code}: {e}")
            return False, "Internal server error"
    
    def get_user_by_telegram_id(self, telegram_id: int) -> Optional[User]:
        """Получает пользователя по Telegram ID"""
        try:
            binding = TelegramBinding.objects.filter(
                telegram_id=telegram_id,
                is_active=True
            ).exclude(telegram_id=0).first()
            
            return binding.user if binding else None
            
        except Exception as e:
            logger.error(f"Error getting user by Telegram ID {telegram_id}: {e}")
            return None
    
    async def get_user_by_telegram_id_async(self, telegram_id: int) -> Optional[User]:
        """Асинхронная версия получения пользователя по Telegram ID"""
        try:
            from asgiref.sync import sync_to_async
            
            @sync_to_async
            def get_binding():
                return TelegramBinding.objects.filter(
                    telegram_id=telegram_id,
                    is_active=True
                ).exclude(telegram_id=0).first()
            
            @sync_to_async
            def get_user(binding):
                return binding.user if binding else None
            
            binding = await get_binding()
            return await get_user(binding)
            
        except Exception as e:
            logger.error(f"Error getting user by Telegram ID {telegram_id}: {e}")
            return None
    
    def cleanup_expired_tokens(self):
        """Очищает просроченные токены привязки (старше 24 часов)"""
        try:
            from datetime import timedelta
            
            cutoff_time = timezone.now() - timedelta(hours=24)
            
            expired_count = TelegramBinding.objects.filter(
                is_active=False,
                created_at__lt=cutoff_time
            ).delete()[0]
            
            if expired_count > 0:
                logger.info(f"Cleaned up {expired_count} expired binding tokens")
                
        except Exception as e:
            logger.error(f"Error cleaning up expired binding tokens: {e}")

# Глобальный экземпляр сервиса
telegram_binding_service = TelegramBindingService()
