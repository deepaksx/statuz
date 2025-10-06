@echo off
echo.
echo ========================================
echo   STATUZ - Start with Full Logs
echo ========================================
echo.

cd /d "%~dp0"

echo Building all packages...
call npm run build:shared
call npm run build:event-bus
call npm run build:db
call npm run build:agents
call npm run build:background
call npm run build:main

echo.
echo Starting Vite in background...
start /B cmd /c "cd apps\renderer && npm run dev"

echo Waiting 3 seconds for Vite to start...
timeout /t 3 /nobreak > nul

echo.
echo Launching Electron in development mode...
echo All logs will appear in this window
echo.

set NODE_ENV=development
npx electron dist/main/main.js

pause
