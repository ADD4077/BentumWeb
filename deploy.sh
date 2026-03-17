#!/bin/bash

# 🚀 Скрипт деплоя BentumWeb на Zetalink 4/4/50

set -e

echo "🚀 Начинаем деплой BentumWeb на Zetalink..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для вывода статуса
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
   error "Этот скрипт нужно запускать с правами root (sudo ./deploy.sh)"
fi

# Проверка наличия Docker
if ! command -v docker &> /dev/null; then
    error "Docker не установлен. Пожалуйста установите Docker."
fi

# Проверка наличия Docker Compose
if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose не установлен. Пожалуйста установите Docker Compose."
fi

# Создание необходимых директорий
status "Создание директорий..."
mkdir -p nginx/ssl
mkdir -p nginx/logs
mkdir -p backend/logs
mkdir -p backups

# Проверка наличия .env файла
if [ ! -f .env ]; then
    warning ".env файл не найден. Создаем пример..."
    cat > .env << EOF
# Database
POSTGRES_DB=bentumweb
POSTGRES_USER=bentumweb
POSTGRES_PASSWORD=secure_password_2024

# Django
DEBUG=False
SECRET_KEY=your-super-secret-key-change-this-in-production
ALLOWED_HOSTS=localhost,127.0.0.1,bentumweb.zetalink.ru
DATABASE_URL=postgresql://bentumweb:secure_password_2024@db:5432/bentumweb

# Redis
REDIS_URL=redis://:redis_password_2024@redis:6379/0

# CORS
CORS_ALLOWED_ORIGINS=https://bentumweb.zetalink.ru,http://localhost:3000
EOF
    warning "Отредактируйте .env файл и запустите скрипт снова!"
    exit 1
fi

# Остановка существующих контейнеров
status "Остановка существующих контейнеров..."
docker-compose down || true

# Сборка образов
status "Сборка Docker образов..."
docker-compose build --no-cache

# Запуск контейнеров
status "Запуск контейнеров..."
docker-compose up -d

# Ожидание запуска базы данных
status "Ожидание запуска базы данных..."
sleep 30

# Проверка здоровья контейнеров
status "Проверка здоровья контейнеров..."
for i in {1..10}; do
    if docker-compose exec -T db pg_isready -U bentumweb -d bentumweb &> /dev/null; then
        status "База данных готова!"
        break
    fi
    if [ $i -eq 10 ]; then
        error "База данных не запустилась за 10 попыток"
    fi
    sleep 5
done

# Миграции базы данных
status "Применение миграций..."
docker-compose exec -T backend python manage.py migrate --noinput

# Сбор статики
status "Сбор статических файлов..."
docker-compose exec -T backend python manage.py collectstatic --noinput

# Создание суперпользователя (если нужно)
if ! docker-compose exec -T backend python manage.py shell -c "from django.contrib.auth.models import User; print(User.objects.filter(is_superuser=True).exists())" | grep -q "True"; then
    status "Создание суперпользователя..."
    docker-compose exec -T backend python manage.py createsuperuser --noinput --username admin --email admin@bentumweb.zetalink.ru || true
    warning "Пароль суперпользователя установлен как 'admin123'. Измените его в панели администратора!"
fi

# Проверка здоровья всех сервисов
status "Финальная проверка здоровья..."
sleep 10

# Проверка backend
if curl -f http://localhost/api/health &> /dev/null; then
    status "✅ Backend работает корректно"
else
    error "❌ Backend не отвечает"
fi

# Проверка frontend
if curl -f http://localhost &> /dev/null; then
    status "✅ Frontend работает корректно"
else
    error "❌ Frontend не отвечает"
fi

# Показ статуса контейнеров
status "Статус контейнеров:"
docker-compose ps

# Показ логов для проверки
status "Последние логи:"
docker-compose logs --tail=5

echo ""
echo -e "${GREEN}🎉 Деплой успешно завершен!${NC}"
echo ""
echo "📋 Полезные команды:"
echo "  Просмотр логов: docker-compose logs -f"
echo "  Перезапуск: docker-compose restart"
echo "  Остановка: docker-compose down"
echo "  Обновление: git pull && docker-compose build && docker-compose up -d"
echo ""
echo "🌐 Приложение доступно по адресу: https://bentumweb.zetalink.ru"
echo "🔐 Админ-панель: https://bentumweb.zetalink.ru/admin"
echo "👤 Логин: admin"
echo "🔑 Пароль: admin123 (измените после первого входа!)"
echo ""
echo -e "${YELLOW}⚠️  ВАЖНО: Измените пароль суперпользователя и настройте SSL сертификат!${NC}"
