@echo off
echo.
echo ========================================
echo   STATUZ - Quick Start
echo ========================================
echo.

cd /d "%~dp0"

REM Ensure main process is built
echo Building main process...
cd apps\desktop
call npm run build
cd ..\..

REM Remove production renderer to force dev mode
if exist dist\renderer (
    rmdir /s /q dist\renderer
)

echo.
echo Starting Vite in background...
start /B cmd /c "cd apps\renderer && npm run dev"

echo Waiting 3 seconds for Vite to start...
timeout /t 3 /nobreak > nul

echo.
echo Launching Electron in development mode...
echo.

set NODE_ENV=development
npx electron dist/main/main.js

pause
