$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot

Push-Location $repoRoot
try {
  docker compose up -d --build @args
}
finally {
  Pop-Location
}
