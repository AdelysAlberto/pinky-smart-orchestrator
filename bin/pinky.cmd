@echo off
setlocal
set "PINKY_HOME=%USERPROFILE%\.pinky"

where bun >nul 2>nul
if %ERRORLEVEL% equ 0 (
    bun "%PINKY_HOME%\bin\pinky" %*
    exit /b %ERRORLEVEL%
)

where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
    node "%PINKY_HOME%\bin\pinky" %*
    exit /b %ERRORLEVEL%
)

echo Error: Node.js o Bun son requeridos para ejecutar Pinky CLI en Windows.
exit /b 1
