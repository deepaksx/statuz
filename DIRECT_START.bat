@echo off
echo.
echo ========================================
echo   STATUZ - Direct Launch
echo ========================================
echo.

cd /d "%~dp0"

REM Remove production build to force dev mode
if exist dist\renderer (
    echo Removing old production build...
    rmdir /s /q dist\renderer
)

echo Starting Vite dev server in background...
start /B cmd /c "cd apps\renderer && npm run dev"

echo Waiting 5 seconds for Vite to start...
timeout /t 5 /nobreak > nul

echo.
echo Launching Electron in development mode...
echo (Window should appear now!)
echo.
set NODE_ENV=development
npx electron dist/main/main.js

pause
