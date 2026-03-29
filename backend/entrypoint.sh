#!/bin/bash
set -e

python manage.py makemigrations

python manage.py migrate

set +e
python manage.py createsuperuser --username "$DJANGO_SUPERUSER_USERNAME" --noinput
set -e

python manage.py collectstatic

# Запускаем Telegram бота в фоновом режиме
if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
    echo "🚀 Запуск Telegram бота..."
    python manage.py run_telegram_bot &
    BOT_PID=$!
    echo "Telegram бот запущен с PID: $BOT_PID"
fi

exec "$@"