@echo off
echo.
echo ========================================
echo   STATUZ - Production Mode
echo ========================================
echo.
echo Building for production (one-time)...
echo.

cd /d "%~dp0"

REM Build renderer for production
cd apps\renderer
call npm run build
cd ..\..

echo.
echo Starting Electron in production mode...
echo.

REM Run electron pointing to production build
npx electron dist/main/main.js

pause
