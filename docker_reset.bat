@echo off
REM 🐳 Полное пересоздание Docker контейнеров для Windows

echo 🗄️ Полное пересоздание Docker контейнеров BentumWeb
echo ==================================================

REM 1. Остановка всех контейнеров
echo 🛑 Остановка контейнеров...
docker-compose down --remove-orphans

REM 2. Удаление всех volumes (включая базу данных)
echo 🗑️ Удаление всех volumes (включая БД)...
docker-compose down -v

REM 3. Удаление всех образов проекта
echo 🗑️ Удаление образов проекта...
docker-compose down --rmi all

REM 4. Очистка Docker системы
echo 🧹 Очистка Docker системы...
docker system prune -f --volumes

REM 5. Удаление неиспользуемых сетей
echo 🗑️ Удаление неиспользуемых сетей...
docker network prune -f

REM 6. Проверка что ничего не осталось
echo 🔍 Проверка остатков...
docker volume ls
docker image ls | findstr bentumweb
docker ps -a | findstr bentumweb

echo.
echo ✅ Полная очистка завершена!
echo.
echo 🚀 Запуск новых контейнеров...
echo ==================================================

REM 7. Сборка и запуск новых контейнеров
echo 🔨 Сборка образов...
docker-compose build --no-cache

echo 🚀 Запуск контейнеров...
docker-compose up -d

REM 8. Ожидание запуска
echo ⏳ Ожидание запуска сервисов...
timeout /t 10 /nobreak

REM 9. Проверка статуса
echo 🔍 Проверка статуса контейнеров...
docker-compose ps

REM 10. Создание суперпользователя
echo 👤 Создание суперпользователя...
docker-compose exec backend python manage.py createsuperuser --username admin --email admin@bntu.by --noinput
if errorlevel 1 echo ⚠️ Суперпользователь уже существует

REM 11. Применение миграций
echo 🗄️ Применение миграций...
docker-compose exec backend python manage.py migrate
if errorlevel 1 echo ⚠️ Миграции уже применены

echo.
echo 🎉 Контейнеры пересозданы!
echo.
echo 📋 Данные для доступа:
echo    🌐 Frontend: http://localhost:3000
echo    🔧 Backend: http://localhost:8000
echo    👤 Админка: http://localhost:8000/admin/
echo    👤 Логин: admin
echo    🔑 Пароль: admin123
echo.
echo 🔍 Проверка API:
echo    📊 Статистика: http://localhost:8000/api/public/stats

pause
