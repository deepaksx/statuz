@echo off
REM Automated Version Backup Script for Statuz
REM Usage: backup-version.bat [patch|minor|major] "commit message"

setlocal enabledelayedexpansion

REM Default to patch if not specified
set VERSION_TYPE=%1
if "%VERSION_TYPE%"=="" set VERSION_TYPE=patch

REM Get commit message
set COMMIT_MSG=%~2
if "%COMMIT_MSG%"=="" (
    echo ERROR: Commit message required
    echo Usage: backup-version.bat [patch^|minor^|major] "commit message"
    exit /b 1
)

echo ========================================
echo Statuz Automated Version Backup
echo ========================================
echo.

REM Check for uncommitted changes
git diff-index --quiet HEAD --
if errorlevel 1 (
    echo 📝 Found uncommitted changes
) else (
    echo ℹ️  No changes to commit
    choice /C YN /M "Continue anyway to create new version"
    if errorlevel 2 exit /b 0
)

echo.
echo 🔢 Bumping version (%VERSION_TYPE%)...
call npm version %VERSION_TYPE% --no-git-tag-version

REM Get new version from package.json
for /f "tokens=2 delims=:, " %%a in ('findstr /C:"\"version\"" package.json') do set NEW_VERSION=%%a
set NEW_VERSION=%NEW_VERSION:"=%

echo ✅ New version: %NEW_VERSION%
echo.

REM Stage all changes
echo 📦 Staging all changes...
git add .

REM Commit changes
echo 💾 Committing changes...
git commit -m "%COMMIT_MSG% (v%NEW_VERSION%)"

REM Create git tag
echo 🏷️  Creating git tag...
git tag -a v%NEW_VERSION% -m "Release v%NEW_VERSION%: %COMMIT_MSG%"

REM Push to origin (statuz repo)
echo 📤 Pushing to origin (statuz)...
git push origin test-aipm
git push origin --tags

REM Push to aipm repo
echo 📤 Pushing to aipm...
git push aipm test-aipm:master
git push aipm --tags

echo.
echo ========================================
echo ✅ Backup Complete!
echo ========================================
echo Version: v%NEW_VERSION%
echo Branch: test-aipm
echo Remotes: origin + aipm
echo Tag: v%NEW_VERSION%
echo ========================================

endlocal
