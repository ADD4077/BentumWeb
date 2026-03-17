# 🚀 Деплой BentumWeb на Zetalink 4/4/50

## 📋 Содержание
1. [Подготовка сервера](#подготовка-сервера)
2. [Docker конфигурация](#docker-конфигурация)
3. [Сборка и деплой](#сборка-и-деплой)
4. [Настройка Nginx](#настройка-nginx)
5. [SSL и безопасность](#ssl-и-безопасность)

---

## 🔧 Подготовка сервера

### 1. Обновление системы
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install docker.io docker-compose nginx certbot python3-certbot-nginx -y
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

### 2. Настройка файрвола
```bash
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

---

## 🐳 Docker конфигурация

### docker-compose.yml
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    container_name: bentumweb_backend
    restart: unless-stopped
    environment:
      - DEBUG=False
      - DATABASE_URL=postgresql://bentumweb:password@db:5432/bentumweb
      - ALLOWED_HOSTS=localhost,127.0.0.1,your-domain.com
    depends_on:
      - db
    volumes:
      - ./backend/media:/app/media
    networks:
      - bentumweb_network

  frontend:
    build: ./frontend
    container_name: bentumweb_frontend
    restart: unless-stopped
    networks:
      - bentumweb_network

  db:
    image: postgres:15
    container_name: bentumweb_db
    restart: unless-stopped
    environment:
      - POSTGRES_DB=bentumweb
      - POSTGRES_USER=bentumweb
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - bentumweb_network

  nginx:
    image: nginx:alpine
    container_name: bentumweb_nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - ./backend/media:/var/www/media
    depends_on:
      - frontend
      - backend
    networks:
      - bentumweb_network

volumes:
  postgres_data:

networks:
  bentumweb_network:
    driver: bridge
```

---

## 🏗️ Сборка и деплой

### 1. Клонирование и подготовка
```bash
git clone https://github.com/your-repo/BentumWeb.git
cd BentumWeb
cp .env.example .env
# Настройте .env файл
```

### 2. Сборка образов
```bash
docker-compose build --no-cache
```

### 3. Запуск
```bash
docker-compose up -d
```

### 4. Миграции базы данных
```bash
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py collectstatic --noinput
docker-compose exec backend python manage.py createsuperuser
```

---

## 🌐 Настройка Nginx

### nginx/nginx.conf
```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:8000;
    }

    upstream frontend {
        server frontend:80;
    }

    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        location /media/ {
            alias /var/www/media/;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

---

## 🔒 SSL и безопасность

### 1. Получение SSL сертификата
```bash
sudo certbot --nginx -d your-domain.com
```

### 2. Автопродление SSL
```bash
sudo crontab -e
# Добавить строку:
0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 📊 Мониторинг

### Проверка статуса
```bash
docker-compose ps
docker-compose logs -f
docker-compose exec backend python manage.py check
```

### Обновление
```bash
git pull
docker-compose build --no-cache
docker-compose up -d
docker-compose exec backend python manage.py migrate
```

---

## 🚨 Траблшутинг

### Проверка логов
```bash
docker-compose logs backend
docker-compose logs frontend
docker-compose logs nginx
```

### Перезапуск сервисов
```bash
docker-compose restart
docker-compose restart backend
```

### Очистка
```bash
docker-compose down -v
docker system prune -a
```

---

## 📞 Поддержка

- **Backend порт:** 8000
- **Frontend порт:** 80
- **Database порт:** 5432
- **Nginx порты:** 80, 443

**Zetalink 4/4/50 готов к работе! 🎉**
