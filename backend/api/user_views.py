from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view
from .models import User
from django.utils import timezone
import json
import re
from datetime import datetime, timedelta
from django.conf import settings

@api_view(['GET'])
def get_all_users(request):
    """Получить всех пользователей для админки"""
    try:
        # Проверяем что пользователь админ (ID = 1)
        if not request.session.get('is_authenticated'):
            return JsonResponse({"detail": "Требуется авторизация"}, status=401)
        
        # Получаем текущего пользователя
        try:
            current_user = User.objects.get(student_code=request.session.get('student_code'))
        except User.DoesNotExist:
            return JsonResponse({"detail": "Пользователь не найден"}, status=404)
        
        # Проверяем что это админ
        if current_user.id != 1:
            return JsonResponse({"detail": "Доступ запрещен"}, status=403)
        
        # Получаем всех пользователей
        users = User.objects.all().order_by('-created_at')
        
        users_data = []
        for user in users:
            users_data.append({
                'id': user.id,
                'fullname': user.fullname,
                'student_code': user.student_code,
                'faculty': user.faculty,
                'registration_date': user.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'last_login': None,  # Пока не храним last_login
                'status': 'banned' if user.is_banned else 'active',
                'avatar_url': None,  # Будет добавлено позже
                'ban_reason': None,
                'ban_end_date': None,
                'is_banned': user.is_banned
            })
        
        return JsonResponse({
            "success": True,
            "users": users_data
        })
        
    except Exception as e:
        return JsonResponse({
            "success": False,
            "detail": f"Ошибка: {str(e)}"
        }, status=500)

@api_view(['GET'])
def get_users_stats(request):
    """Получить статистику пользователей"""
    try:
        # Проверяем что пользователь админ (ID = 1)
        if not request.session.get('is_authenticated'):
            return JsonResponse({"detail": "Требуется авторизация"}, status=401)
        
        # Получаем текущего пользователя
        try:
            current_user = User.objects.get(student_code=request.session.get('student_code'))
        except User.DoesNotExist:
            return JsonResponse({"detail": "Пользователь не найден"}, status=404)
        
        # Проверяем что это админ
        if current_user.id != 1:
            return JsonResponse({"detail": "Доступ запрещен"}, status=403)
        
        total_users = User.objects.count()
        banned_users = User.objects.filter(is_banned=True).count()
        active_users = total_users - banned_users
        
        # Новые пользователи сегодня
        today = timezone.now().date()
        new_users_today = User.objects.filter(created_at__date=today).count()
        
        return JsonResponse({
            "success": True,
            "stats": {
                "totalUsers": total_users,
                "bannedUsers": banned_users,
                "activeUsers": active_users,
                "newUsersToday": new_users_today
            }
        })
        
    except Exception as e:
        return JsonResponse({
            "success": False,
            "detail": f"Ошибка: {str(e)}"
        }, status=500)

@api_view(['POST'])
def create_user(request):
    """Создать нового пользователя"""
    try:
        # Проверяем что пользователь админ (ID = 1)
        if not request.session.get('is_authenticated'):
            return JsonResponse({"detail": "Требуется авторизация"}, status=401)
        
        # Получаем текущего пользователя
        try:
            current_user = User.objects.get(student_code=request.session.get('student_code'))
        except User.DoesNotExist:
            return JsonResponse({"detail": "Пользователь не найден"}, status=404)
        
        # Проверяем что это админ
        if current_user.id != 1:
            return JsonResponse({"detail": "Доступ запрещен"}, status=403)
        
        data = json.loads(request.body)
        
        # Валидация
        required_fields = ['fullname', 'student_code', 'faculty']
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
        
        # Проверка на дубликаты
        if User.objects.filter(student_code=data['student_code']).exists():
            return JsonResponse({
                'success': False,
                'detail': 'Пользователь с таким кодом студента уже существует'
            }, status=400)
        
        # Создаем пользователя
        user = User.objects.create(
            fullname=data['fullname'],
            student_code=data['student_code'],
            faculty=data['faculty'],
            bilet_code='0000000',  # Пароль по умолчанию
            is_banned=False
        )
        
        return JsonResponse({
            'success': True,
            'message': f'Пользователь {data["fullname"]} успешно создан'
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'detail': f"Ошибка: {str(e)}"
        }, status=500)

@api_view(['POST'])
def ban_user(request):
    """Забанить пользователя"""
    try:
        # Проверяем что пользователь админ (ID = 1)
        if not request.session.get('is_authenticated'):
            return JsonResponse({"detail": "Требуется авторизация"}, status=401)
        
        # Получаем текущего пользователя
        try:
            current_user = User.objects.get(student_code=request.session.get('student_code'))
        except User.DoesNotExist:
            return JsonResponse({"detail": "Пользователь не найден"}, status=404)
        
        # Проверяем что это админ
        if current_user.id != 1:
            return JsonResponse({"detail": "Доступ запрещен"}, status=403)
        
        data = json.loads(request.body)
        user_id = data.get('user_id')
        reason = data.get('reason', 'Причина не указана')
        duration = data.get('duration', 7)  # дней
        
        # Проверяем что не банят админа
        user_to_ban = User.objects.get(id=user_id)
        if user_to_ban.id == 1:
            return JsonResponse({
                'success': False,
                'detail': 'Нельзя забанить администратора'
            }, status=403)
        
        # Баним пользователя
        user_to_ban.is_banned = True
        user_to_ban.save()
        
        return JsonResponse({
            'success': True,
            'message': f'Пользователь {user_to_ban.fullname} заблокирован'
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'detail': f"Ошибка: {str(e)}"
        }, status=500)

@api_view(['POST'])
def unban_user(request):
    """Разбанить пользователя"""
    try:
        # Проверяем что пользователь админ (ID = 1)
        if not request.session.get('is_authenticated'):
            return JsonResponse({"detail": "Требуется авторизация"}, status=401)
        
        # Получаем текущего пользователя
        try:
            current_user = User.objects.get(student_code=request.session.get('student_code'))
        except User.DoesNotExist:
            return JsonResponse({"detail": "Пользователь не найден"}, status=404)
        
        # Проверяем что это админ
        if current_user.id != 1:
            return JsonResponse({"detail": "Доступ запрещен"}, status=403)
        
        data = json.loads(request.body)
        user_id = data.get('user_id')
        
        if not user_id:
            return JsonResponse({
                'success': False,
                'detail': 'ID пользователя обязателен'
            }, status=400)
        
        # Разбаниваем пользователя
        user_to_unban = User.objects.get(id=user_id)
        user_to_unban.is_banned = False
        user_to_unban.save()
        
        return JsonResponse({
            'success': True,
            'message': f'Пользователь {user_to_unban.fullname} разблокирован'
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'detail': f"Ошибка: {str(e)}"
        }, status=500)
