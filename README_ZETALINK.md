# 🚀 BentumWeb на Zetalink 4/4/50

## 📋 Обзор

Полная инструкция по развертыванию BentumWeb на сервере Zetalink с конфигурацией 4/4/50 (4 CPU, 4GB RAM, 50GB SSD).

---

## 🏗️ Архитектура

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Nginx       │    │   Frontend      │    │    Backend      │
│   (Reverse      │◄──►│   (React +      │◄──►│   (Django +      │
│    Proxy)       │    │    Vite)        │    │   PostgreSQL)   │
│  Port: 80,443   │    │   Port: 80      │    │   Port: 8000    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │   (Database)    │
                    │   Port: 5432    │
                    └─────────────────┘
```

---

## ⚡ Производительность Zetalink 4/4/50

### 📊 Ресурсы сервера
- **CPU:** 4 ядра @ 2.4GHz
- **RAM:** 4GB DDR4
- **SSD:** 50GB NVMe
- **Сеть:** 100Mbps

### 🎯 Оптимизированная конфигурация
- **Nginx:** 2 worker processes
- **PostgreSQL:** 100 max connections
- **Django:** 3 Gunicorn workers
- **Redis:** для кэширования сессий

---

## 🚀 Быстрый старт

### 1. Подготовка сервера (5 минут)
```bash
# SSH подключение к серверу
ssh root@your-zetalink-ip

# Обновление и установка
sudo apt update && sudo apt upgrade -y
sudo apt install docker.io docker-compose nginx certbot -y
sudo systemctl enable docker
```

### 2. Клонирование и настройка (2 минуты)
```bash
git clone https://github.com/your-repo/BentumWeb.git
cd BentumWeb
cp .env.example .env
# Отредактируйте .env файл
```

### 3. Деплой (3 минуты)
```bash
sudo ./deploy.sh
```

**🎉 Через 10 минут ваше приложение будет работать!**

---

## 📁 Структура проекта

```
BentumWeb/
├── 📁 backend/                 # Django API
│   ├── Dockerfile              # Конфигурация Docker
│   ├── requirements.txt        # Зависимости Python
│   └── manage.py              # Управление Django
├── 📁 frontend/               # React приложение
│   ├── Dockerfile              # Конфигурация Docker
│   ├── package.json           # Зависимости Node.js
│   └── vite.config.js         # Конфигурация Vite
├── 📁 nginx/                   # Nginx конфигурация
│   ├── nginx.conf              # Основной конфиг
│   └── ssl/                    # SSL сертификаты
├── 📁 docker-compose.yml       # Docker сервисы
├── 📄 deploy.sh               # Скрипт деплоя
├── 📄 update.sh               # Скрипт обновления
└── 📄 .env.example            # Пример конфигурации
```

---

## 🔧 Конфигурация

### Docker Compose сервисы
- **backend:** Django + Gunicorn
- **frontend:** React + Nginx
- **db:** PostgreSQL 15
- **redis:** Redis 7 для кэширования
- **nginx:** Reverse proxy + SSL

### Оптимизация для Zetalink 4/4/50
```yaml
# PostgreSQL оптимизация
environment:
  - POSTGRES_SHARED_PRELOAD_LIBRARIES=pg_stat_statements
  - POSTGRES_MAX_CONNECTIONS=100
  - POSTGRES_SHARED_BUFFERS=256MB

# Django оптимизация
environment:
  - DJANGO_SETTINGS_MODULE=config.settings.production
  - GUNICORN_WORKERS=3
  - GUNICORN_TIMEOUT=120

# Nginx оптимизация
worker_processes 2;
worker_connections 1024;
keepalive_timeout 65;
```

---

## 📊 Мониторинг

### Проверка статуса
```bash
# Статус всех сервисов
docker-compose ps

# Логи в реальном времени
docker-compose logs -f

# Нагрузка на систему
htop
df -h
free -h
```

### Health checks
```bash
# Backend health
curl https://bentumweb.zetalink.ru/api/health

# Frontend health
curl https://bentumweb.zetalink.ru

# Database health
docker-compose exec db pg_isready
```

---

## 🔄 Обновление

### Автоматическое обновление
```bash
# Простое обновление
sudo ./update.sh

# Ручное обновление
git pull
docker-compose build
docker-compose up -d
```

### Откат изменений
```bash
# Просмотр коммитов
git log --oneline

# Откат на предыдущий коммит
git checkout <commit-hash>
sudo ./update.sh
```

---

## 🔒 Безопасность

### SSL/TLS
```bash
# Автоматический SSL
sudo certbot --nginx -d bentumweb.zetalink.ru

# Автопродление
0 12 * * * /usr/bin/certbot renew --quiet
```

### Firewall
```bash
# Настройка UFW
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### Backup
```bash
# Автоматический бэкап
0 2 * * * /path/to/backup.sh
```

---

## 🚨 Траблшутинг

### Частые проблемы

**❌ Контейнер не запускается**
```bash
# Проверка логов
docker-compose logs backend

# Перезапуск
docker-compose restart
```

**❌ База данных не отвечает**
```bash
# Проверка подключения
docker-compose exec db pg_isready

# Рестарт базы данных
docker-compose restart db
```

**❌ Nginx ошибки**
```bash
# Проверка конфигурации
docker-compose exec nginx nginx -t

# Перезапуск Nginx
docker-compose restart nginx
```

### Полная диагностика
```bash
# Системная информация
docker-compose exec backend python manage.py check
docker-compose exec db psql -U bentumweb -c "SELECT version();"
docker stats
```

---

## 📞 Поддержка

### Контактная информация
- **Email:** support@bentumweb.zetalink.ru
- **Telegram:** @bentumweb_support
- **Документация:** https://docs.bentumweb.zetalink.ru

### Время ответа
- **Критические проблемы:** 15 минут
- **Общие вопросы:** 2 часа
- **Запросы на функции:** 24 часа

---

## 🎯 Метрики производительности

### Ожидаемая производительность на Zetalink 4/4/50
- **Время загрузки:** < 2 секунды
- **Response time:** < 200ms
- **Concurrent users:** 500+
- **Uptime:** 99.9%
- **Database queries:** < 50ms

### Мониторинг в реальном времени
```bash
# Нагрузка на CPU
docker stats

# Использование памяти
free -h

# Дисковое пространство
df -h

# Сетевая активность
iftop
```

---

**🎉 BentumWeb готов к работе на Zetalink 4/4/50!**

*Сервер оптимизирован для максимальной производительности и надежности.*
