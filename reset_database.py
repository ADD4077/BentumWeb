#!/usr/bin/env python
"""
Альтернативный скрипт для пересоздания БД через SQL
"""

import os
import subprocess
import sys

def reset_database_sql():
    """Пересоздание БД через SQL команды"""
    
    print("🔄 Пересоздание базы данных через SQL...")
    
    # Проверяем переменные окружения
    db_engine = os.getenv('DATABASE_ENGINE', 'mysql')
    db_name = os.getenv('DATABASE_NAME', 'dockerdjango')
    db_user = os.getenv('DATABASE_USERNAME', 'admin')
    db_password = os.getenv('DATABASE_PASSWORD', 'RllyStrongPassword')
    db_host = os.getenv('DATABASE_HOST', 'localhost')
    db_port = os.getenv('DATABASE_PORT', '3306')
    
    print(f"📊 Параметры подключения:")
    print(f"   Движок: {db_engine}")
    print(f"   База: {db_name}")
    print(f"   Хост: {db_host}:{db_port}")
    
    try:
        if db_engine == 'mysql':
            # 1. Подключаемся к MySQL и удаляем/создаем БД
            mysql_commands = [
                f"DROP DATABASE IF EXISTS {db_name};",
                f"CREATE DATABASE {db_name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
                f"USE {db_name};",
                "SHOW TABLES;"
            ]
            
            for cmd in mysql_commands:
                print(f"🔧 Выполняем: {cmd}")
                result = subprocess.run([
                    'mysql', 
                    f'-h{db_host}', 
                    f'-P{db_port}',
                    f'-u{db_user}',
                    f'-p{db_password}',
                    '-e', cmd
                ], capture_output=True, text=True)
                
                if result.returncode != 0:
                    print(f"❌ Ошибка: {result.stderr}")
                    return False
                else:
                    print(f"✅ Выполнено")
        
        print("\n🎉 База данных пересоздана!")
        return True
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return False

def create_django_migrations():
    """Создаем и применяем Django миграции"""
    
    print("\n🔄 Создаем Django миграции...")
    
    try:
        # Переходим в директорию backend
        os.chdir('backend')
        
        # Создаем миграции
        result = subprocess.run([sys.executable, 'manage.py', 'makemigrations'], 
                              capture_output=True, text=True)
        if result.returncode != 0:
            print(f"❌ Ошибка создания миграций: {result.stderr}")
            return False
        print("✅ Миграции созданы")
        
        # Применяем миграции
        result = subprocess.run([sys.executable, 'manage.py', 'migrate'], 
                              capture_output=True, text=True)
        if result.returncode != 0:
            print(f"❌ Ошибка применения миграций: {result.stderr}")
            return False
        print("✅ Миграции применены")
        
        # Создаем суперпользователя
        result = subprocess.run([sys.executable, 'manage.py', 'createsuperuser', 
                               '--username', 'admin', '--noinput'], 
                              capture_output=True, text=True)
        if result.returncode != 0:
            print("⚠️ Суперпользователь уже существует или ошибка создания")
        else:
            print("✅ Суперпользователь создан")
        
        return True
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return False

if __name__ == "__main__":
    print("🗄️ Полное пересоздание базы данных BentumWeb")
    print("=" * 50)
    
    # Способ 1: SQL + Django
    if reset_database_sql():
        if create_django_migrations():
            print("\n🎉 База данных успешно пересоздана!")
            print("📋 Данные для входа:")
            print("   Пользователь: admin")
            print("   Пароль: admin123")
        else:
            print("❌ Ошибка при создании миграций")
    else:
        print("❌ Ошибка при пересоздании БД")
