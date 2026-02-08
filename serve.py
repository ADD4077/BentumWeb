#!/usr/bin/env python3
import http.server
import socketserver
import os
import webbrowser
import time
from pathlib import Path

# Определяем порт
PORT = 3000
DIRECTORY = Path(__file__).parent / "frontend"

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIRECTORY), **kwargs)
    
    def end_headers(self):
        # Добавляем CORS заголовки для поддержки cookie
        self.send_header('Access-Control-Allow-Origin', 'http://127.0.0.1:3000')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Credentials', 'true')

        # Отключаем кэширование в dev, чтобы изменения JS/CSS применялись сразу
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

if __name__ == "__main__":
    # Проверяем что директория существует
    if not DIRECTORY.exists():
        print(f"Ошибка: Директория {DIRECTORY} не найдена")
        exit(1)
    
    print(f"Директория с файлами: {DIRECTORY}")
    
    # Меняем рабочую директорию
    os.chdir(str(DIRECTORY))
    
    with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
        print(f"Сервер запущен на http://127.0.0.1:{PORT}")
        print(f"Откройте в браузере: http://127.0.0.1:{PORT}/main.html?v={int(time.time())}")
        print(f"API сервер должен работать на: http://127.0.0.1:8000")
        print("\nНажмите Ctrl+C для остановки")
        
        # Автоматически открываем браузер
        webbrowser.open(f'http://127.0.0.1:{PORT}/main.html')
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nСервер остановлен")
