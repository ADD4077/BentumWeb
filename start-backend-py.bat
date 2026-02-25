@echo off
echo Starting BNTU Bot Backend (using py launcher)...

REM Попытка перейти по первому пути (текущий проект)
cd /d "d:\BENTUM WEB\BentumWeb\backend" 2>nul
if %errorlevel% equ 0 (
    echo Found project at: d:\BENTUM WEB\BentumWeb\backend
    goto :found
)

REM Попытка перейти по второму пути (старый проект)
cd /d "C:\Users\Amfisak\Documents\GitHub\BentumWeb\backend" 2>nul
if %errorlevel% equ 0 (
    echo Found project at: C:\Users\Amfisak\Documents\GitHub\BentumWeb\backend
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
py -m pip install -r requirements.txt
if errorlevel 1 (
    echo Failed to install requirements.txt!
    echo Trying to install essential packages manually...
    py -m pip install django djangorestframework django-cors-headers
)

REM Start Django server
echo Starting Django server...
py manage.py runserver

pause
