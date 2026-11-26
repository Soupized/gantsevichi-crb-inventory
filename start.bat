@echo off
setlocal EnableExtensions
chcp 65001 >nul
set "ROOT=%~dp0"
set "LOG=%ROOT%start.log"
set "TARGET=%ROOT%start.cmd"
set "CODE=0"

call "%TARGET%" > "%LOG%" 2>&1
set "CODE=%ERRORLEVEL%"

type "%LOG%"
echo.
if not "%CODE%"=="0" (
  echo [ERROR] Exit code %CODE%
  echo Log: %LOG%
) else (
  echo Stopped. Log: %LOG%
)
echo.
pause
endlocal & exit /b %CODE%
