#!/usr/bin/env python3
"""
Скрипт для запуска Telegram бота
"""
import os
import sys
import asyncio
import logging

# Добавляем путь к Django проекту
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    """Главная функция"""
    try:
        # Импортируем после настройки пути
        from api.telegram_bot import main as bot_main
        
        logger.info("🚀 Запуск Telegram бота...")
        
        # Запускаем бота
        asyncio.run(bot_main())
        
    except KeyboardInterrupt:
        logger.info("⏹️  Бот остановлен пользователем")
    except Exception as e:
        logger.error(f"❌ Ошибка запуска бота: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
