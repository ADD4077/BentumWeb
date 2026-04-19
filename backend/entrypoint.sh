#!/bin/bash
set -e

python manage.py makemigrations

python manage.py migrate

if [ -n "$DJANGO_SUPERUSER_USERNAME" ]; then
if python manage.py shell -c "
from django.contrib.auth import get_user_model
import os

User = get_user_model()
username = os.environ.get('DJANGO_SUPERUSER_USERNAME')

if username and not User.objects.filter(username=username).exists():
    raise SystemExit(1)
"
then
  echo "Superuser already exists"
else
  python manage.py createsuperuser --username "$DJANGO_SUPERUSER_USERNAME" --noinput
fi
fi

python manage.py collectstatic --noinput

exec "$@"
