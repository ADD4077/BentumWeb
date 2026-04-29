#!/bin/bash
set -e

if [ "${SKIP_INIT_TASKS:-0}" = "1" ]; then
  exec "$@"
fi

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
  python manage.py shell -c "
from django.contrib.auth import get_user_model
import os

User = get_user_model()
username = os.environ.get('DJANGO_SUPERUSER_USERNAME')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')

if username and password and not User.objects.filter(username=username).exists():
    user = User(username=username, is_superuser=True, is_staff=True, is_active=True)
    user.set_password(password)
    user.save()
"
fi
fi

python manage.py collectstatic --noinput

exec "$@"
