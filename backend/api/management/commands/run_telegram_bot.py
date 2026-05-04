from django.core.management.base import BaseCommand
import asyncio
import logging
from api.telegram_bot import TelegramBot, setup_django

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Запуск Telegram бота'

    def add_arguments(self, parser):
        parser.add_argument(
            '--polling',
            action='store_true',
            help='Запустить бота в режиме polling (по умолчанию)',
        )
        parser.add_argument(
            '--webhook',
            action='store_true',
            help='Запустить бота в режиме webhook',
        )
        parser.add_argument(
            '--webhook-url',
            type=str,
            help='URL для webhook режима',
        )

    def handle(self, *args, **options):
        """Основная команда"""
        self.stdout.write(self.style.SUCCESS('🚀 Запуск Telegram бота...'))
        
        try:
            # Настраиваем Django
            setup_django()
            
            # Создаем бота
            bot = TelegramBot()
            
            if options['webhook']:
                self.stdout.write(self.style.WARNING('⚠️  Webhook режим не реализован'))
                self.stdout.write(self.style.SUCCESS('Используйте --polling для запуска'))
                return
            
            # Запускаем в режиме polling
            self.stdout.write(self.style.SUCCESS('📡 Запуск в режиме polling...'))
            asyncio.run(bot.start())
            
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING('\n⏹️  Бот остановлен пользователем'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Ошибка запуска бота: {e}'))
            logger.error(f"Bot startup error: {e}", exc_info=True)
