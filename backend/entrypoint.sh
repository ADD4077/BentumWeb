#!/bin/bash
set -e

run_init_tasks() {
  python manage.py makemigrations

  python manage.py migrate

  if [ -n "$DJANGO_SUPERUSER_USERNAME" ]; then
  if python manage.py shell -c "
from django.contrib.auth import get_user_model
import os

User = get_user_model()
identifier = os.environ.get('DJANGO_SUPERUSER_STUDENT_CODE') or os.environ.get('DJANGO_SUPERUSER_USERNAME')
lookup_field = User.USERNAME_FIELD

if identifier and not User.objects.filter(**{lookup_field: identifier}).exists():
    raise SystemExit(1)
"
  then
    echo "Superuser already exists"
  else
    python manage.py shell -c "
from django.contrib.auth import get_user_model
import os

User = get_user_model()
identifier = os.environ.get('DJANGO_SUPERUSER_STUDENT_CODE') or os.environ.get('DJANGO_SUPERUSER_USERNAME')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')
fullname = os.environ.get('DJANGO_SUPERUSER_FULLNAME') or identifier or 'admin'
faculty = os.environ.get('DJANGO_SUPERUSER_FACULTY') or 'ADMIN'
lookup_field = User.USERNAME_FIELD

if identifier and password and not User.objects.filter(**{lookup_field: identifier}).exists():
    User.objects.create_superuser(
        **{
            lookup_field: identifier,
            'password': password,
            'fullname': fullname,
            'faculty': faculty,
        }
    )
"
  fi
  fi

  python manage.py collectstatic --noinput
}

if [ "${SKIP_INIT_TASKS:-0}" = "1" ]; then
  exec "$@"
fi

run_init_tasks

exec "$@"