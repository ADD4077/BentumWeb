#!/bin/bash
set -e

APP_UID="${APP_UID:-appuser}"

ensure_storage_permissions() {
  for path in /app/static /app/media /app/books /app/news /app/schedules; do
    mkdir -p "$path"
    chown -R "$APP_UID":"$APP_UID" "$path"
  done
}

run_init_tasks() {
  gosu "$APP_UID" python manage.py migrate

  if [ -n "$DJANGO_SUPERUSER_USERNAME" ]; then
  if gosu "$APP_UID" python manage.py shell -c "
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
    gosu "$APP_UID" python manage.py shell -c "
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

  gosu "$APP_UID" python manage.py collectstatic --noinput
}

ensure_storage_permissions

if [ "${SKIP_INIT_TASKS:-0}" = "1" ]; then
  exec gosu "$APP_UID" "$@"
fi

run_init_tasks

exec gosu "$APP_UID" "$@"
