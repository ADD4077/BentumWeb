@echo off
echo Starting BNTU Bot Frontend...

cd /d ".\frontend" 2>nul
if %errorlevel% equ 0 (
    echo Found project at: d:\BENTUM WEB\BentumWeb\frontend
    goto :found
)

REM Если ни один путь не найден
echo ERROR: Project folder not found!
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

echo Starting frontend server...
echo.
echo Frontend will be available at: http://localhost:5173
echo Press Ctrl+C to stop the server
echo.

echo Installing dependencies...
call npm install

echo.
echo Starting development server...
call npm run dev

pause
