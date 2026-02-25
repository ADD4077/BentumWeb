@echo off
echo Installing frontend dependencies...

REM Попытка перейти по первому пути (текущий проект)
cd /d "d:\BENTUM WEB\BentumWeb\frontend" 2>nul
if %errorlevel% equ 0 (
    echo Found project at: d:\BENTUM WEB\BentumWeb\frontend
    goto :found
)

REM Попытка перейти по второму пути (старый проект)
cd /d "C:\Users\Amfisak\Documents\GitHub\BentumWeb\frontend" 2>nul
if %errorlevel% equ 0 (
    echo Found project at: C:\Users\Amfisak\Documents\GitHub\BentumWeb\frontend
    goto :found
)

REM Попытка перейти по третьему пути (альтернативный)
cd /d "d:\BENTUM WEB\BentumWeb\bntu-bot-vite\frontend" 2>nul
if %errorlevel% equ 0 (
    echo Found project at: d:\BENTUM WEB\BentumWeb\bntu-bot-vite\frontend
    goto :found
)

REM Если ни один путь не найден
echo ERROR: Frontend folder not found!
echo Please check the paths in this batch file.
echo.
pause
exit /b

:found
echo Checking Node.js...
node --version
if errorlevel 1 (
    echo ERROR: Node.js not found!
    echo Please install Node.js from: https://nodejs.org
    echo.
    pause
    exit /b
)

echo Installing all dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies!
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
