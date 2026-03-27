# 🐳 ПОЛНОЕ ПЕРЕСОЗДАНИЕ DOCKER КОНТЕЙНЕРОВ

## 📋 ИНСТРУКЦИИ ДЛЯ WINDOWS

### 🚀 БЫСТРЫЙ СПОСОБ (РЕКОМЕНДУЕТСЯ)

```cmd
# Запустить скрипт для Windows
docker_reset.bat
```

### 🔧 ПОШАГОВЫЕ КОМАНДЫ

```cmd
# 1. Остановка всех контейнеров
docker-compose down --remove-orphans

# 2. Удаление всех volumes (включая БД)
docker-compose down -v

# 3. Удаление всех образов проекта
docker-compose down --rmi all

# 4. Полная очистка Docker
docker system prune -f --volumes

# 5. Удаление неиспользуемых сетей
docker network prune -f

# 6. Сборка и запуск новых контейнеров
docker-compose build --no-cache
docker-compose up -d

# 7. Создание суперпользователя
docker-compose exec backend python manage.py createsuperuser --username admin --email admin@bntu.by --noinput

# 8. Применение миграций
docker-compose exec backend python manage.py migrate
```

---

## 📋 ИНСТРУКЦИИ ДЛЯ LINUX/MAC

### 🚀 БЫСТРЫЙ СПОСОБ

```bash
# Запустить скрипт для Linux/Mac
chmod +x docker_reset.sh
./docker_reset.sh
```

### 🔧 ПОШАГОВЫЕ КОМАНДЫ

```bash
# 1. Полная остановка и удаление
docker-compose down --remove-orphans -v

# 2. Удаление образов
docker-compose down --rmi all

# 3. Очистка системы
docker system prune -f --volumes
docker network prune -f

# 4. Проверка остатков
docker volume ls
docker image ls | grep bentumweb
docker ps -a | grep bentumweb

# 5. Пересборка и запуск
docker-compose build --no-cache
docker-compose up -d

# 6. Настройка
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser --username admin --email admin@bntu.by --noinput
```

---

## 🗄️ ЧТО УДАЛЯЕТСЯ

### ❌ ПОЛНОСТЬЮ УДАЛЯЕТСЯ:
- **Все контейнеры** проекта
- **Все volumes** (включая базу данных)
- **Все образы** проекта
- **Все сети** проекта
- **Все данные** пользователей
- **Все медиа файлы**
- **Все сессии**
- **Все блокировки**

### ✅ СОХРАНЯЕТСЯ:
- **Исходный код** проекта
- **Конфигурационные файлы**
- **Dockerfile** и **docker-compose.yaml**

---

## 🎯 РЕЗУЛЬТАТ ПОСЛЕ ПЕРЕСОЗДАНИЯ

### 🐳 НОВЫЕ КОНТЕЙНЕРЫ:
- **backend** - Django API сервер
- **frontend** - React приложение
- **database** - MySQL база данных
- **nginx** - Веб сервер (если есть)

### 🗄️ ЧИСТАЯ БАЗА ДАННЫХ:
- **6 пустых таблиц** со правильной структурой
- **Суперпользователь** admin/admin123
- **Все индексы** и связи

### 🔐 ДОСТУП:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **Админ панель:** http://localhost:8000/admin/
- **Публичная статистика:** http://localhost:8000/api/public/stats

---

## 🚨 ВАЖНЫЕ МОМЕНТЫ

### ⚠️ ПРЕДУПРЕЖДЕНИЯ:
1. **Все данные будут безвозвратно удалены**
2. **Сохраните важную информацию** заранее
3. **Проект будет недоступен** во время пересоздания

### 🔍 ПРОВЕРКА РАБОТЫ:
```bash
# Проверить статус контейнеров
docker-compose ps

# Проверить логи
docker-compose logs backend
docker-compose logs frontend

# Проверить API
curl http://localhost:8000/api/public/stats
```

### 🛠️ ПРОБЛЕМЫ И РЕШЕНИЯ:

#### **❌ Ошибка: "port already in use"**
```bash
# Найти процесс на порту
netstat -ano | findstr :3000
netstat -ano | findstr :8000

# Убить процесс
taskkill /PID <PID> /F
```

#### **❌ Ошибка: "docker-compose not found"**
```bash
# Установить Docker Desktop
# Или использовать docker compose (без дефиса)
```

#### **❌ Ошибка: "permission denied"**
```bash
# Запустить от имени администратора
# Linux/macOS: sudo docker-compose...
```

---

## 📞 ПОДДЕРЖКА

Если возникнут проблемы:
1. **Проверьте Docker Desktop** - запущен ли он
2. **Проверьте порты** - не заняты ли 3000, 8000, 3306
3. **Проверьте логи** - `docker-compose logs`
4. **Перезапустите Docker** - полный перезапуск сервиса

---

## 🎉 ГОТОВО!

После выполнения этих команд у вас будет полностью чистая система с новыми контейнерами и пустой базой данных!
