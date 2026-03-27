#!/bin/bash
set -e

python manage.py makemigrations

python manage.py migrate

set +e
python manage.py createsuperuser --username "$DJANGO_SUPERUSER_USERNAME" --noinput
set -e

python manage.py collectstatic

exec "$@"