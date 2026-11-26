@echo off
setlocal
cd /d "%~dp0client"
if not exist "node_modules" (
  call npm.cmd install
)
call npm.cmd run build
if errorlevel 1 exit /b 1
cd /d "%~dp0server"
if "%ASPNETCORE_ENVIRONMENT%"=="" set "ASPNETCORE_ENVIRONMENT=Production"
set "DOTNET=%USERPROFILE%\.dotnet\dotnet.exe"
if not exist "%DOTNET%" set "DOTNET=dotnet"

REM Адрес, на котором будет доступно приложение.
REM По умолчанию: 0.0.0.0:5169 — доступно на этом ПК и с других устройств в локальной сети.
REM Для доступа только с этого ПК задайте: set "APP_URLS=http://localhost:5169"
if "%APP_URLS%"=="" set "APP_URLS=http://0.0.0.0:5169"

echo.
echo Запуск приложения: %APP_URLS%
echo Откройте в браузере: http://localhost:5169 (на этом ПК) или http://^<IP-этого-ПК^>:5169 (из локальной сети)
echo.
"%DOTNET%" run --no-launch-profile --urls "%APP_URLS%"
