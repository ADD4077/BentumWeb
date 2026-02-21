@echo off
echo Installing frontend dependencies...

cd /d "d:\BENTUM WEB\BentumWeb\bntu-bot-vite\frontend"

echo Checking Node.js...
node --version
if errorlevel 1 (
    echo ERROR: Node.js not found!
    echo Please install Node.js from: https://nodejs.org
    echo.
    pause
    exit /b
)

echo Installing lucide-react for icons...
call npm install lucide-react
if errorlevel 1 (
    echo ERROR: Failed to install lucide-react!
    echo.
    pause
    exit /b
)

echo.
echo Dependencies installed successfully!
echo Starting frontend...
echo.

call npm run dev

pause
