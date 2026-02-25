@echo off
echo Testing API connection...

REM Попытка перейти по первому пути (текущий проект)
cd /d "d:\BENTUM WEB\BentumWeb\backend" 2>nul
if %errorlevel% equ 0 (
    echo Found backend at: d:\BENTUM WEB\BentumWeb\backend
    goto :test_api
)

REM Попытка перейти по второму пути (старый проект)
cd /d "C:\Users\Amfisak\Documents\GitHub\BentumWeb\backend" 2>nul
if %errorlevel% equ 0 (
    echo Found backend at: C:\Users\Amfisak\Documents\GitHub\BentumWeb\backend
    goto :test_api
)

REM Если ни один путь не найден
echo ERROR: Backend folder not found!
echo Please check the paths in this batch file.
echo.
pause
exit /b

:test_api
echo Testing API endpoints...
echo.

echo 1. Testing dashboard endpoint...
curl -X GET http://127.0.0.1:8000/api/dashboard --include

echo.
echo 2. Testing login endpoint...
curl -X POST http://127.0.0.1:8000/api/save_data ^
 -H "Content-Type: application/json" ^
 -d "{\"studentCode\":\"10701120\",\"studentRedCode\":\"1234567\"}" ^
 --include

echo.
echo 3. Testing theme endpoint...
curl -X POST http://127.0.0.1:8000/api/theme ^
 -H "Content-Type: application/json" ^
 -d "{\"theme\":\"light\"}" ^
 --include

echo.
echo If you see JSON responses - API works!
echo.
echo Make sure Django server is running (use start-backend.bat)
pause
