$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot

Push-Location $repoRoot
try {
  docker compose build --no-cache @args
  docker compose up -d @args
}
finally {
  Pop-Location
}
