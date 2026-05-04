# BentumWeb

BentumWeb — full-stack платформа для студентов с Django backend, React/Vite frontend, Telegram-интеграцией, 2FA, новостями, литературой, расписанием и административными сценариями.

## Стек

- Backend: Django 4.2, Django REST Framework, MySQL, Redis
- Frontend: React 18, Vite 5
- Инфраструктура: Docker Compose, background worker, Telegram bot container

## Структура проекта

- `backend/` — Django-приложение, API, фоновые задачи, тесты
- `frontend/` — React/Vite-приложение
- `compose.yaml` — локальное multi-service окружение
- `compose.vps.yaml` — production-oriented Docker Compose для VPS
- `scripts/` — helper-скрипты для локальных проверок
- `.env.example` — шаблон переменных окружения
- `.env.vps.example` — шаблон production-переменных для VPS

## Что нужно для запуска

### Вариант 1: Docker Compose

Нужно:

- Docker Desktop
- включённая виртуализация
- рабочий WSL2 / Hyper-V backend

Если Docker Desktop не стартует на Windows, сначала проверьте:

- `VirtualMachinePlatform`
- `Microsoft-Windows-Subsystem-Linux`
- `HypervisorPlatform`
- `hypervisorlaunchtype=Auto`

### Вариант 2: Локальный frontend без Docker

Нужно:

- Node.js 20+
- backend, доступный по `http://localhost:1337`

## Быстрый старт через Docker

1. Создайте `.env` из шаблона:

```powershell
Copy-Item .env.example .env
```

2. При необходимости отредактируйте `.env`.

Минимум проверьте:

- `DJANGO_SECRET_KEY`
- `DATABASE_PASSWORD`
- `DJANGO_SUPERUSER_USERNAME`
- `DJANGO_SUPERUSER_PASSWORD`

3. Поднимите проект:

```powershell
docker compose up --build
```

После старта будут доступны:

- frontend: `http://localhost:5173`
- backend: `http://localhost:1337`

## VPS deployment

Render для проекта не нужен, если целевая среда — VPS. Для VPS используйте:

```bash
cp .env.vps.example .env
docker compose -f compose.vps.yaml up -d --build
```

На VPS наружу должен смотреть только host nginx/caddy с TLS. Он проксирует домен на `127.0.0.1:8080`, а backend, MySQL и Redis остаются закрытыми внутри Docker-сети.

Подробности: `docs/vps-deployment.md`.

## Что делает backend при старте

Backend container автоматически:

- применяет миграции через `python manage.py migrate`
- создаёт superuser, если он ещё не существует
- собирает статику через `collectstatic`

Важно:

- `makemigrations` автоматически при старте больше не вызывается
- новые миграции нужно создавать явно вручную

## Полезные команды

### Запуск smoke-тестов backend на SQLite

```powershell
docker compose run --rm -e DJANGO_TEST_USE_SQLITE=1 server python -m pytest api/tests.py -q
```

### Django check

```powershell
docker compose run --rm server python manage.py check
```

### Создать новые миграции вручную

```powershell
docker compose run --rm server python manage.py makemigrations
```

### Применить миграции вручную

```powershell
docker compose run --rm server python manage.py migrate
```

### Пересобрать backend container

```powershell
docker compose build server
```

### Удалить временный тестовый контейнер SQLite

```powershell
docker rm -f backend-test-sqlite
```

## Локальный frontend без Docker

Если backend уже работает отдельно:

1. создайте `frontend/.env.local`
2. добавьте:

```env
VITE_API_URL=http://localhost:1337
```

3. запустите frontend:

```powershell
cd frontend
npm install
npm run dev
```

## Локальные проверки качества

### Все проверки скриптом

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\check-all.ps1
```

### Frontend

```powershell
cd frontend
npm install
npm run lint
npm run build
```

### Backend синтаксис локально

```powershell
cd backend
python -m py_compile api\*.py
```

## Перенос на другой ПК

Для запуска проекта на другой машине обычно достаточно передать:

- `backend/`
- `frontend/`
- `scripts/`
- `compose.yaml`
- `.env.example`
- `init.sql`
- `README.md`

Не нужно передавать:

- `frontend/node_modules`
- `frontend/dist`
- `backend/test.sqlite3`
- `backend/media`
- кэши и локальные IDE-файлы

## Примечания

- Для Docker Compose frontend использует proxy на `/api`, поэтому `VITE_API_URL` можно оставить пустым.
- Для локального frontend вне Docker `VITE_API_URL` лучше указать явно.
- Если BNTU TLS ведёт себя нестабильно, insecure fallback разрешается только через `BNTU_ALLOW_INSECURE_SSL` или в `DEBUG`.
