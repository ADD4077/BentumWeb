#!/bin/bash

# 🔄 Скрипт обновления BentumWeb на Zetalink

set -e

echo "🔄 Обновление BentumWeb..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Проверка прав root
if [[ $EUID -ne 0 ]]; then
   error "Этот скрипт нужно запускать с правами root (sudo ./update.sh)"
fi

# Бэкап базы данных
status "Создание бэкапа базы данных..."
BACKUP_FILE="backups/bentumweb_$(date +%Y%m%d_%H%M%S).sql"
docker-compose exec -T db pg_dump -U bentumweb bentumweb > $BACKUP_FILE
status "Бэкап сохранен: $BACKUP_FILE"

# Получение последних изменений
status "Получение последних изменений из Git..."
git pull origin main

# Остановка контейнеров
status "Остановка контейнеров..."
docker-compose down

# Сборка новых образов
status "Сборка новых Docker образов..."
docker-compose build --no-cache

# Запуск контейнеров
status "Запуск контейнеров..."
docker-compose up -d

# Ожидание запуска
status "Ожидание запуска сервисов..."
sleep 30

# Применение миграций
status "Применение миграций..."
docker-compose exec -T backend python manage.py migrate --noinput

# Сбор статики
status "Сбор статических файлов..."
docker-compose exec -T backend python manage.py collectstatic --noinput

# Перезапуск Nginx для применения новых настроек
status "Перезапуск Nginx..."
docker-compose restart nginx

# Проверка здоровья
status "Проверка здоровья сервисов..."
sleep 10

if curl -f http://localhost/api/health &> /dev/null; then
    status "✅ Backend работает корректно"
else
    error "❌ Backend не отвечает после обновления"
fi

if curl -f http://localhost &> /dev/null; then
    status "✅ Frontend работает корректно"
else
    error "❌ Frontend не отвечает после обновления"
fi

# Очистка старых Docker образов
status "Очистка старых Docker образов..."
docker image prune -f

echo ""
echo -e "${GREEN}🎉 Обновление успешно завершено!${NC}"
echo ""
echo "📋 Статус контейнеров:"
docker-compose ps
echo ""
echo "💾 Бэкап базы данных: $BACKUP_FILE"
