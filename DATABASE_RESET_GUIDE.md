# 🗄️ ИНСТРУКЦИЯ ПО ПЕРЕСОЗДАНИЮ БАЗЫ ДАННЫХ

## 📋 СПОСОБЫ ПЕРЕСОЗДАНИЯ БД

### 🚀 СПОСОБ 1: Автоматический скрипт (РЕКОМЕНДУЕТСЯ)

```bash
# 1. Перейти в корень проекта
cd c:\Users\Amfisak\Documents\GitHub\BentumWeb

# 2. Запустить скрипт пересоздания
python backend/reset_database.py
```

### 🔧 СПОСОБ 2: Вручную через Django команды

```bash
# 1. Перейти в директорию backend
cd c:\Users\Amfisak\Documents\GitHub\BentumWeb\backend

# 2. Удалить миграции (если есть)
find . -name "migrations" -type d -exec rm -rf {} + 2>/dev/null || true

# 3. Создать новые миграции
python manage.py makemigrations

# 4. Применить миграции
python manage.py migrate

# 5. Создать суперпользователя
python manage.py createsuperuser --username admin --noinput
```

### 🗄️ СПОСОБ 3: Через SQL + Django

```bash
# 1. Запустить скрипт полного пересоздания
python reset_database.py

# 2. Или вручную через MySQL:
mysql -h localhost -u admin -pRllyStrongPassword -e "
DROP DATABASE IF EXISTS dockerdjango;
CREATE DATABASE dockerdjango CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
"

# 3. Затем применить миграции Django
cd backend
python manage.py makemigrations
python manage.py migrate
```

### 🐳 СПОСОБ 4: Через Docker (если используется)

```bash
# 1. Остановить контейнеры
docker-compose down

# 2. Удалить volumes (включая БД)
docker-compose down -v

# 3. Запустить заново
docker-compose up --build

# 4. Создать суперпользователя
docker-compose exec backend python manage.py createsuperuser --username admin --noinput
```

## ⚙️ ПРОВЕРКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ

Убедитесь что в `.env` файле есть:

```bash
DATABASE_ENGINE=mysql
DATABASE_NAME=dockerdjango
DATABASE_USERNAME=admin
DATABASE_PASSWORD=RllyStrongPassword
DATABASE_HOST=localhost
DATABASE_PORT=3306
```

## 📊 РЕЗУЛЬТАТ

После пересоздания БД вы получите:

✅ **Чистую базу данных** со всеми таблицами  
✅ **Суперпользователя** для входа в админку  
✅ **Корректную структуру** всех моделей  
✅ **Рабочие эндпоинты** для API  

## 🔐 ДАННЫЕ ДЛЯ ВХОДА

**Администратор Django:**
- Имя пользователя: `admin`
- Пароль: `admin123`
- URL: `http://localhost:8000/admin/`

**API эндпоинты:**
- Публичная статистика: `http://localhost:8000/api/public/stats`
- Авторизация: `http://localhost:8000/api/save_data`

## 🚨 ВАЖНО

1. **Сохраните важные данные** перед пересозданием
2. **Проверьте подключение** к БД перед запуском
3. **Запустите сервер** после пересоздания для проверки
4. **Создайте тестовых пользователей** через админку

## 📞 ПОДДЕРЖКА

Если возникнут проблемы:
1. Проверьте логи ошибок
2. Убедитесь что MySQL сервер запущен
3. Проверьте права доступа к БД
4. Проверьте переменные окружения
