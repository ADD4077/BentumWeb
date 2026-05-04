# VPS deployment

This project should run on a VPS as a single-origin application:

`internet -> host nginx/caddy with TLS -> 127.0.0.1:8080 -> frontend nginx container -> Django container`

Only the host reverse proxy should be public. Do not expose Django, MySQL, or Redis ports to the internet.

## Files

- `compose.vps.yaml` - production Docker Compose profile for VPS.
- `.env.vps.example` - production environment template.
- `frontend/nginx.conf` - internal nginx that serves the React build and proxies `/api`, `/admin`, and `/static` to Django.

## First setup

```bash
cp .env.vps.example .env
nano .env
```

Required values:

- `APP_DOMAIN`
- `WEB_APP_URL`
- `DJANGO_SECRET_KEY`
- `DJANGO_ALLOWED_HOSTS`
- `CORS_ALLOWED_ORIGINS`
- `CSRF_TRUSTED_ORIGINS`
- `DATABASE_PASSWORD`
- `DATABASE_ROOT_PASSWORD`
- `TELEGRAM_INTERNAL_API_TOKEN`

For one-domain deployment, keep:

```env
VITE_API_URL=
CORS_ALLOWED_ORIGINS=https://your-domain.example
CSRF_TRUSTED_ORIGINS=https://your-domain.example
```

## Start

```bash
docker compose -f compose.vps.yaml up -d --build
docker compose -f compose.vps.yaml ps
docker compose -f compose.vps.yaml logs -f server
```

## Host nginx example

Replace `bentum.example.com` with the real domain.

```nginx
server {
    listen 80;
    server_name bentum.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name bentum.example.com;

    ssl_certificate /etc/letsencrypt/live/bentum.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bentum.example.com/privkey.pem;

    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        # Overwrite, do not append user-supplied X-Forwarded-For.
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
    }
}
```

If nginx rejects `$connection_upgrade`, add this to the top-level `http {}` block:

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    "" close;
}
```

## Backup

Back up these Docker volumes:

- `mysql_data`
- `media_data`
- `books_data`
- `news_data`
- `schedules_data`

Minimum MySQL dump:

```bash
docker compose -f compose.vps.yaml exec db \
  sh -c 'mysqldump -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
  > bentum-$(date +%F).sql
```

## Update

```bash
git pull
docker compose -f compose.vps.yaml up -d --build
docker compose -f compose.vps.yaml logs --tail=100 server
```

## Rollback

Use a Git tag or previous commit, then rebuild:

```bash
git checkout <known-good-ref>
docker compose -f compose.vps.yaml up -d --build
```
