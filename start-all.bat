@echo off
echo Starting BNTU Bot - Backend and Frontend...

REM Убиваем все старые процессы
echo Killing old processes...
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

echo.
echo ========================================
echo Starting Backend Server...
echo ========================================

start "Backend Server" cmd /k "cd /d backend && venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000"

timeout /t 3 >nul

echo.
echo ========================================
echo Starting Frontend Server...
echo ========================================

start "Frontend Server" cmd /k "cd /d frontend && npm run dev"

echo.
echo ========================================
echo Servers are starting...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo ========================================
echo.
echo Press any key to exit...
pause >nul
