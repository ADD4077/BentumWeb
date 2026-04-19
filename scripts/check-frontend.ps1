$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendDir = Join-Path $repoRoot "frontend"
$npmCmd = "D:\nodejs\npm.cmd"

if (-not (Test-Path $npmCmd)) {
    throw "npm.cmd not found at $npmCmd"
}

Push-Location $frontendDir
try {
    & $npmCmd ci
    & $npmCmd run lint
    & $npmCmd run build
}
finally {
    Pop-Location
}
