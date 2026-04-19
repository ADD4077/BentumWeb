# BentumWeb

BentumWeb - это full-stack платформа для студентов с Django-бэкендом и React/Vite-фронтендом. В репозитории также есть локальная Docker-инфраструктура, фоновые задачи, Telegram-интеграции, административные сценарии, загрузка медиа, 2FA и контентные модули.

## Стек

- Backend: Django, Django REST Framework, MySQL, Redis
- Frontend: React 18, Vite
- Инфраструктура: Docker Compose, background worker, контейнер Telegram-бота

## Структура проекта

- `backend/` - Django-приложение, API-модули, логика воркера, тесты
- `frontend/` - React/Vite-приложение
- `compose.yaml` - локальное multi-service окружение
- `.github/workflows/` - CI workflow-файлы

## Локальный запуск

### Вариант 1: Docker Compose

1. Создайте или обновите корневой `.env`
2. Поднимите стек:

```powershell
docker compose up --build
```

Фронтенд будет доступен на `http://localhost:5173`, бэкенд - на `http://localhost:1337`.

### Вариант 2: Только фронтенд

```powershell
cd frontend
D:\nodejs\npm.cmd ci
D:\nodejs\npm.cmd run dev
```

### Вариант 3: Только бэкенд

Используйте контейнер проекта или локальное Python-окружение с зависимостями из `backend/requirements.txt`.

## Проверки качества

### Локальные проверки одной командой

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\check-all.ps1
```

### Фронтенд

```powershell
cd frontend
D:\nodejs\npm.cmd ci
D:\nodejs\npm.cmd run lint
D:\nodejs\npm.cmd run build
```

### Smoke-тесты бэкенда

Тестовый запуск бэкенда теперь поддерживает SQLite для smoke/integration-проверки без необходимости выдавать MySQL-пользователю права на создание test database.

```powershell
docker compose run --rm -e DJANGO_TEST_USE_SQLITE=1 server python -m pytest api/tests.py -q
```

### Django check для бэкенда

```powershell
docker compose run --rm server python manage.py check
```

### Локальная очистка временных Docker-хвостов

Если после ручных тестовых прогонов остался временный контейнер `backend-test-sqlite`, его можно удалить так:

```powershell
docker rm -f backend-test-sqlite
```

## Примечания

- `lint/build` фронтенда покрыты через `.github/workflows/quality.yml`
- smoke-тесты бэкенда в CI запускаются на SQLite через `DJANGO_TEST_USE_SQLITE=1`
- публикация release-образов по-прежнему живёт в существующих Docker image workflow-файлах
- локальные helper-скрипты лежат в `scripts/`
