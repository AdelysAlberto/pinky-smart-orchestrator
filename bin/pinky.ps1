$ErrorActionPreference = "Stop"
$PinkyHome = Join-Path $HOME ".pinky"
$PinkyBin = Join-Path $PinkyHome "bin\pinky"

if (Get-Command bun -ErrorAction SilentlyContinue) {
    & bun $PinkyBin $args
    exit $LASTEXITCODE
}

if (Get-Command node -ErrorAction SilentlyContinue) {
    & node $PinkyBin $args
    exit $LASTEXITCODE
}

Write-Error "Error: Node.js o Bun son requeridos para ejecutar Pinky CLI en Windows PowerShell."
exit 1
