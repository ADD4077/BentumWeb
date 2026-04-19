$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot

Push-Location $repoRoot
try {
    docker rm -f backend-test-sqlite 2>$null | Out-Null
    docker compose run --rm -e DJANGO_SUPERUSER_USERNAME= -e DJANGO_SUPERUSER_PASSWORD= -e DJANGO_SUPERUSER_EMAIL= server python manage.py check
    docker compose run --rm -e DJANGO_TEST_USE_SQLITE=1 -e DJANGO_SUPERUSER_USERNAME= -e DJANGO_SUPERUSER_PASSWORD= -e DJANGO_SUPERUSER_EMAIL= server python -m pytest api/tests.py -q
}
finally {
    Pop-Location
}
