@echo off
echo Starting BNTU Bot Backend...

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
REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Python not found! Please install Python first.
    echo Download from: https://www.python.org/downloads/
    pause
    exit /b
)

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
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
pip install -r requirements.txt
if errorlevel 1 (
    echo Failed to install dependencies!
    echo Trying to install Django manually...
    pip install django djangorestframework django-cors-headers
)

REM Start Django server
echo Starting Django server...
python manage.py runserver

pause
