@echo off
echo Starting BNTU Bot Backend (using py launcher)...

REM Убиваем все старые процессы Python
echo Killing old Python processes...
taskkill /F /IM python.exe >nul 2>&1
timeout /t 2 >nul

cd /d ".\backend" 2>nul
if %errorlevel% equ 0 (
    echo Found project at: d:\BENTUM WEB\BentumWeb\backend
    goto :found
)

REM Если ни один путь не найден
echo ERROR: Backend folder not found!
echo Please check the paths in this batch file.
echo.
pause
exit /b

:found
REM Check if py launcher is available
py --version >nul 2>&1
if errorlevel 1 (
    echo Python py launcher not found!
    echo Please install Python from: https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation
    pause
    exit /b
)

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    py -m venv venv
    if errorlevel 1 (
        echo Failed to create virtual environment!
        pause
        exit /b
    )
)

REM Activate virtual environment
call venv\Scripts\activate
if errorlevel 1 (
    echo Failed to activate virtual environment!
    pause
    exit /b
)

REM Install dependencies
echo Installing dependencies...

.\venv\Scripts\python.exe -m pip install -r ..\requirements.txt

REM Start Django server
echo Starting Django server...
.\venv\Scripts\python.exe manage.py runserver

pause
