@echo off
echo.
echo ========================================
echo   STATUZ - Fast Mode (No DevTools)
echo ========================================
echo.

cd /d "%~dp0"

echo Starting Vite dev server in background...
start /B cmd /c "cd apps\renderer && npm run dev"

echo Waiting 5 seconds for Vite to start...
timeout /t 5 /nobreak > nul

echo.
echo Launching Electron (No DevTools for speed)...
echo.

set NO_DEVTOOLS=1
npx electron dist/main/main.js

pause
