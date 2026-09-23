# ==============================================================================
# Pinky Smart Orchestrator - Windows PowerShell Universal Installer
# ==============================================================================

$ErrorActionPreference = "Stop"

$PinkyHome = Join-Path $HOME ".pinky"
$BinDir = Join-Path $HOME ".local\bin"
$RepoUrl = "https://github.com/AdelysAlberto/pinky-smart-orchestrator.git"
$ZipUrl = "https://github.com/AdelysAlberto/pinky-smart-orchestrator/archive/refs/heads/main.zip"

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "    PINKY SMART ORCHESTRATOR - INSTALADOR WINDOWS     " -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Create directories
if (-not (Test-Path $PinkyHome)) {
    New-Item -ItemType Directory -Path $PinkyHome -Force | Out-Null
}
if (-not (Test-Path $BinDir)) {
    New-Item -ItemType Directory -Path $BinDir -Force | Out-Null
}

# 2. Check if running from local repo or remote
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path -ErrorAction SilentlyContinue

if ($ScriptDir -and (Test-Path (Join-Path $ScriptDir "agents-pi")) -and (Test-Path (Join-Path $ScriptDir "bin\pinky"))) {
    Write-Host "Sincronizando archivos locales en $PinkyHome..." -ForegroundColor Cyan
    Copy-Item -Path "$ScriptDir\*" -Destination $PinkyHome -Recurse -Force
} else {
    Write-Host "Descargando Pinky Smart Orchestrator en $PinkyHome..." -ForegroundColor Cyan
    if (Get-Command git -ErrorAction SilentlyContinue) {
        if (Test-Path (Join-Path $PinkyHome ".git")) {
            Push-Location $PinkyHome
            git pull origin main
            Pop-Location
        } else {
            git clone --depth 1 $RepoUrl $PinkyHome
        }
    } else {
        $ZipFile = Join-Path $env:TEMP "pinky-main.zip"
        Invoke-WebRequest -Uri $ZipUrl -OutFile $ZipFile
        Expand-Archive -Path $ZipFile -DestinationPath $env:TEMP -Force
        $ExtractedDir = Join-Path $env:TEMP "pinky-smart-orchestrator-main"
        Copy-Item -Path "$ExtractedDir\*" -Destination $PinkyHome -Recurse -Force
        Remove-Item $ZipFile -Force -ErrorAction SilentlyContinue
        Remove-Item $ExtractedDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# 3. Check for Node.js or Bun runtime
$Runtime = $null
if (Get-Command bun -ErrorAction SilentlyContinue) {
    $Runtime = "bun"
} elseif (Get-Command node -ErrorAction SilentlyContinue) {
    $Runtime = "node"
}

if (-not $Runtime) {
    Write-Host "Aviso: No se detectó Node.js ni Bun en su sistema Windows." -ForegroundColor Yellow
    $InstallBun = Read-Host "¿Desea instalar Bun automáticamente ahora? [S/n]"
    if ($InstallBun -match '^[SsYy]?$' -or [string]::IsNullOrWhiteSpace($InstallBun)) {
        Write-Host "Instalando Bun para Windows..." -ForegroundColor Cyan
        try {
            irm bun.sh/install.ps1 | iex
            $env:BUN_INSTALL = "$HOME\.bun"
            $env:PATH = "$env:BUN_INSTALL\bin;$env:PATH"
            if (Get-Command bun -ErrorAction SilentlyContinue) {
                $Runtime = "bun"
                Write-Host "✓ Bun instalado con éxito." -ForegroundColor Green
            }
        } catch {
            Write-Host "No se pudo instalar Bun automáticamente." -ForegroundColor Red
        }
    }
}

# 4. Install binary wrappers in ~/.local/bin
Copy-Item -Path (Join-Path $PinkyHome "bin\pinky.cmd") -Destination (Join-Path $BinDir "pinky.cmd") -Force
Copy-Item -Path (Join-Path $PinkyHome "bin\pinky.ps1") -Destination (Join-Path $BinDir "pinky.ps1") -Force
Copy-Item -Path (Join-Path $PinkyHome "bin\pinky") -Destination (Join-Path $BinDir "pinky") -Force

# 5. Add ~/.local/bin to User Environment Path
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$BinDir*") {
    $NewUserPath = "$BinDir;$UserPath"
    [Environment]::SetEnvironmentVariable("Path", $NewUserPath, "User")
    $env:PATH = "$BinDir;$env:PATH"
    Write-Host "✓ Se agregó '$BinDir' a la variable PATH de usuario en Windows." -ForegroundColor Green
}

# 6. Execute Pinky CLI
if ($Runtime) {
    & $Runtime (Join-Path $PinkyHome "bin\pinky") $args
} else {
    Write-Host "✓ Pinky CLI configurado en: $BinDir\pinky.cmd" -ForegroundColor Green
    Write-Host "Instale Node.js o Bun para ejecutar: pinky install" -ForegroundColor Yellow
}
