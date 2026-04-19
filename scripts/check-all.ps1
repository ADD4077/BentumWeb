$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot

& (Join-Path $repoRoot "scripts/check-frontend.ps1")
& (Join-Path $repoRoot "scripts/check-backend.ps1")
