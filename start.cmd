@echo off
setlocal
cd /d "%~dp0client"
if not exist "node_modules" (
  call npm.cmd install
)
call npm.cmd run build
if errorlevel 1 exit /b 1
cd /d "%~dp0server"
set "ASPNETCORE_ENVIRONMENT=Development"
set "DOTNET=%USERPROFILE%\.dotnet\dotnet.exe"
if not exist "%DOTNET%" set "DOTNET=dotnet"
"%DOTNET%" run --no-launch-profile --urls "http://localhost:5169"
