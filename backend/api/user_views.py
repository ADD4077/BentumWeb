from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view
import sqlite3
import os
import json
import re
from datetime import datetime, timedelta
from django.conf import settings

@api_view(['GET'])
def get_all_users(request):
    """Получить всех пользователей для админки"""
    try:
        db_path = os.path.join(settings.BASE_DIR, 'users', 'users.db')
        
        if not os.path.exists(db_path):
            return JsonResponse({"detail": "База данных пользователей не найдена"}, status=404)

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, fullname, email, student_code, faculty, 
                   registration_date, last_login, status, avatar_url, 
                   ban_reason, ban_end_date
            FROM users 
            ORDER BY registration_date DESC
        """)
        rows = cursor.fetchall()
        conn.close()
        
        users = []
        for row in rows:
            (user_id, fullname, email, student_code, faculty, 
             registration_date, last_login, status, avatar_url, 
             ban_reason, ban_end_date) = row
            
            users.append({
                'id': user_id,
                'fullname': fullname,
                'email': email,
                'student_code': student_code,
                'faculty': faculty,
                'registration_date': registration_date,
                'last_login': last_login,
                'status': status,
                'avatar_url': avatar_url,
                'ban_reason': ban_reason,
                'ban_end_date': ban_end_date
            })
        
        return JsonResponse({
            'success': True,
            'users': users
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'detail': f'Ошибка при получении пользователей: {str(e)}'
        }, status=500)

@api_view(['GET'])
def get_users_stats(request):
    """Получить статистику пользователей"""
    try:
        db_path = os.path.join(settings.BASE_DIR, 'users', 'users.db')
        
        if not os.path.exists(db_path):
            return JsonResponse({"detail": "База данных пользователей не найдена"}, status=404)

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM users")
        total_users = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM users WHERE status = 'active'")
        active_users = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM users WHERE status = 'banned'")
        banned_users = cursor.fetchone()[0]
        
        # Новые пользователи (сегодня)
        cursor.execute("SELECT COUNT(*) FROM users WHERE registration_date = ?", (datetime.now().strftime('%Y-%m-%d'),))
        new_users_today = cursor.fetchone()[0]
        
        conn.close()
        
        return JsonResponse({
            'success': True,
            'stats': {
                'totalUsers': total_users,
                'activeUsers': active_users,
                'bannedUsers': banned_users,
                'newUsersToday': new_users_today,
                'newUsersThisWeek': 0,
                'newUsersThisMonth': 0
            }
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'detail': f'Ошибка при получении статистики: {str(e)}'
        }, status=500)

@api_view(['POST'])
def create_user(request):
    """Создать нового пользователя"""
    try:
        data = json.loads(request.body)
        
        # Валидация
        required_fields = ['fullname', 'email', 'student_code', 'faculty']
        for field in required_fields:
            if not data.get(field):
                return JsonResponse({
                    'success': False,
                    'detail': f'Поле {field} обязательно для заполнения'
                }, status=400)
        
        # Проверка формата кода студента
        if not re.match(r'^\d{8}$', data['student_code']):
            return JsonResponse({
                'success': False,
                'detail': 'Код студента должен состоять из 8 цифр'
            }, status=400)
        
        # Проверка формата email
        if not re.match(r'^[^@]+@[^@]+\.[^@]+$', data['email']):
            return JsonResponse({
                'success': False,
                'detail': 'Некорректный формат email'
            }, status=400)
        
        db_path = os.path.join(settings.BASE_DIR, 'users', 'users.db')
        
        if not os.path.exists(db_path):
            return JsonResponse({"detail": "База данных пользователей не найдена"}, status=404)

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Проверка на дубликаты
        cursor.execute("SELECT COUNT(*) FROM users WHERE email = ?", (data['email'],))
        if cursor.fetchone()[0] > 0:
            conn.close()
            return JsonResponse({
                'success': False,
                'detail': 'Пользователь с таким email уже существует'
            }, status=400)
        
        cursor.execute("SELECT COUNT(*) FROM users WHERE student_code = ?", (data['student_code'],))
        if cursor.fetchone()[0] > 0:
            conn.close()
            return JsonResponse({
                'success': False,
                'detail': 'Пользователь с таким кодом студента уже существует'
            }, status=400)
        
        # Создание пользователя
        today = datetime.now().strftime('%Y-%m-%d')
        cursor.execute("""
            INSERT INTO users (fullname, email, student_code, faculty, registration_date, last_login, status)
            VALUES (?, ?, ?, ?, ?, ?, 'active')
        """, (
            data['fullname'], data['email'], data['student_code'], 
            data['faculty'], today, today
        ))
        
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return JsonResponse({
            'success': True,
            'message': 'Пользователь успешно создан',
            'user_id': user_id
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'detail': 'Некорректный формат данных'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'detail': f'Ошибка при создании пользователя: {str(e)}'
        }, status=500)

@api_view(['POST'])
def ban_user(request):
    """Забанить пользователя"""
    try:
        data = json.loads(request.body)
        user_id = data.get('user_id')
        reason = data.get('reason', 'Причина не указана')
        duration = data.get('duration', 7)  # дней
        
        if not user_id:
            return JsonResponse({
                'success': False,
                'detail': 'ID пользователя обязателен'
            }, status=400)
        
        # Расчет даты окончания бана
        ban_end_date = (datetime.now() + timedelta(days=duration)).strftime('%Y-%m-%d')
        
        db_path = os.path.join(settings.BASE_DIR, 'users', 'users.db')
        
        if not os.path.exists(db_path):
            return JsonResponse({"detail": "База данных пользователей не найдена"}, status=404)

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Проверка существования пользователя
        cursor.execute("SELECT COUNT(*) FROM users WHERE id = ?", (user_id,))
        if cursor.fetchone()[0] == 0:
            conn.close()
            return JsonResponse({
                'success': False,
                'detail': 'Пользователь не найден'
            }, status=404)
        
        # Обновление статуса
        cursor.execute("""
            UPDATE users 
            SET status = 'banned', ban_reason = ?, ban_end_date = ?
            WHERE id = ?
        """, (reason, ban_end_date, user_id))
        
        conn.commit()
        conn.close()
        
        return JsonResponse({
            'success': True,
            'message': 'Пользователь заблокирован'
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'detail': f'Ошибка при блокировке пользователя: {str(e)}'
        }, status=500)

@api_view(['POST'])
def unban_user(request):
    """Разбанить пользователя"""
    try:
        data = json.loads(request.body)
        user_id = data.get('user_id')
        
        if not user_id:
            return JsonResponse({
                'success': False,
                'detail': 'ID пользователя обязателен'
            }, status=400)
        
        db_path = os.path.join(settings.BASE_DIR, 'users', 'users.db')
        
        if not os.path.exists(db_path):
            return JsonResponse({"detail": "База данных пользователей не найдена"}, status=404)

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Проверка существования пользователя
        cursor.execute("SELECT COUNT(*) FROM users WHERE id = ?", (user_id,))
        if cursor.fetchone()[0] == 0:
            conn.close()
            return JsonResponse({
                'success': False,
                'detail': 'Пользователь не найден'
            }, status=404)
        
        # Обновление статуса
        cursor.execute("""
            UPDATE users 
            SET status = 'active', ban_reason = NULL, ban_end_date = NULL
            WHERE id = ?
        """, (user_id,))
        
        conn.commit()
        conn.close()
        
        return JsonResponse({
            'success': True,
            'message': 'Пользователь разблокирован'
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'detail': f'Ошибка при разблокировке пользователя: {str(e)}'
        }, status=500)
