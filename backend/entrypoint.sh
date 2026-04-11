#!/bin/bash
set -e

python manage.py makemigrations

python manage.py migrate

set +e
python manage.py createsuperuser --username "$DJANGO_SUPERUSER_USERNAME" --noinput || echo "Superuser may already exist"
set -e

python manage.py collectstatic --noinput

exec "$@"