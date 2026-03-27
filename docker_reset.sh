#!/bin/bash
# 🐳 Полное пересоздание Docker контейнеров с удалением всех данных

echo "🗄️ Полное пересоздание Docker контейнеров BentumWeb"
echo "=================================================="

# 1. Остановка всех контейнеров
echo "🛑 Остановка контейнеров..."
docker-compose down --remove-orphans

# 2. Удаление всех volumes (включая базу данных)
echo "🗑️ Удаление всех volumes (включая БД)..."
docker-compose down -v

# 3. Удаление всех образов проекта
echo "🗑️ Удаление образов проекта..."
docker-compose down --rmi all

# 4. Очистка Docker системы
echo "🧹 Очистка Docker системы..."
docker system prune -f --volumes

# 5. Удаление неиспользуемых сетей
echo "🗑️ Удаление неиспользуемых сетей..."
docker network prune -f

# 6. Проверка что ничего не осталось
echo "🔍 Проверка остатков..."
docker volume ls
docker image ls | grep bentumweb
docker ps -a | grep bentumweb

echo ""
echo "✅ Полная очистка завершена!"
echo ""
echo "🚀 Запуск новых контейнеров..."
echo "=================================================="

# 7. Сборка и запуск новых контейнеров
echo "🔨 Сборка образов..."
docker-compose build --no-cache

echo "🚀 Запуск контейнеров..."
docker-compose up -d

# 8. Ожидание запуска
echo "⏳ Ожидание запуска сервисов..."
sleep 10

# 9. Проверка статуса
echo "🔍 Проверка статуса контейнеров..."
docker-compose ps

# 10. Создание суперпользователя
echo "👤 Создание суперпользователя..."
docker-compose exec backend python manage.py createsuperuser \
  --username admin \
  --email admin@bntu.by \
  --noinput || echo "⚠️ Суперпользователь уже существует"

# 11. Применение миграций
echo "🗄️ Применение миграций..."
docker-compose exec backend python manage.py migrate || echo "⚠️ Миграции уже применены"

echo ""
echo "🎉 Контейнеры пересозданы!"
echo ""
echo "📋 Данные для доступа:"
echo "   🌐 Frontend: http://localhost:3000"
echo "   🔧 Backend: http://localhost:8000"
echo "   👤 Админка: http://localhost:8000/admin/"
echo "   👤 Логин: admin"
echo "   🔑 Пароль: admin123"
echo ""
echo "🔍 Проверка API:"
echo "   📊 Статистика: http://localhost:8000/api/public/stats"
