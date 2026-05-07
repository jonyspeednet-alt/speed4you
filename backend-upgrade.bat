@echo off
REM Backend Upgrade Script for Windows
REM ISP Entertainment Portal

setlocal enabledelayedexpansion

cls
echo.
echo ================================
echo Backend Upgrade Script
echo ================================
echo.

REM Check if backend directory exists
if not exist "backend" (
    echo Error: backend directory not found!
    exit /b 1
)

cd backend

echo [Step 1] Backing up current state...
if exist "package-lock.json" (
    copy package-lock.json package-lock.json.backup >nul
    echo OK: package-lock.json backed up
) else (
    echo WARNING: No package-lock.json found
)

echo.
echo [Step 2] Updating dependencies...
echo Updating production dependencies...

call npm install express@^4.21.2 ^
    dotenv@^17.4.2 ^
    helmet@^8.1.0 ^
    joi@^18.1.2 ^
    jsonwebtoken@^9.0.3 ^
    --save

if %ERRORLEVEL% NEQ 0 (
    echo Error updating production dependencies
    goto :error
)

echo OK: Production dependencies updated

echo.
echo Updating dev dependencies...
call npm install nodemon@latest --save-dev

if %ERRORLEVEL% NEQ 0 (
    echo Error updating dev dependencies
    goto :error
)

echo OK: Dev dependencies updated

echo.
echo [Step 3] Checking for vulnerabilities...
call npm audit

echo.
echo [Step 4] Running tests...
call npm test

if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Some tests failed - review manually
) else (
    echo OK: All tests passed
)

echo.
echo [Step 5] Current npm packages...
echo.
call npm list --depth=0

echo.
echo ================================
echo Upgrade Complete!
echo ================================
echo.
echo Next steps:
echo 1. Review changes: git status
echo 2. Test locally: npm run dev
echo 3. Run all tests: npm test
echo 4. Create PR for review
echo.

cd ..
goto :end

:error
echo.
echo An error occurred during upgrade!
cd ..
exit /b 1

:end
