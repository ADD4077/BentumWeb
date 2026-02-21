@echo off
echo Testing API connection...

curl -X POST http://127.0.0.1:8000/api/save_data ^
-H "Content-Type: application/json" ^
-d "{\"student_code\":\"10701120\",\"password\":\"1234567\"}"

echo.
echo If you see JSON response - API works!
pause
