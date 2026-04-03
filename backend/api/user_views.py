from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view
from .models import User
from .ban_service import BanService
import json
import re
from datetime import datetime, timedelta

@api_view(['GET'])
def get_all_users(request):
    """Получить список всех пользователей"""
    try:
        if not request.session.get('is_authenticated'):
            return JsonResponse({'detail': 'Требуется авторизация'}, status=401)
        
        try:
            current_user = User.objects.get(student_code=request.session.get('student_code'))
        except User.DoesNotExist:
            return JsonResponse({'detail': 'Пользователь не найден'}, status=404)
        
        # Проверяем что текущий пользователь - администратор
        from .models import Administration
        if not Administration.objects.filter(administrator=current_user, is_active=True).exists():
            return JsonResponse({'detail': 'Доступ запрещен'}, status=403)
        
        users = User.objects.all().values('id', 'fullname', 'student_code', 'faculty', 'created_at', 'last_login')
        users_list = list(users)
        
        # Добавляем информацию о статусе блокировки для каждого пользователя
        from .ban_service import BanService
        for user in users_list:
            ban_status = BanService.check_ban_status(user['student_code'])
            user['status'] = 'banned' if ban_status['is_banned'] else 'active'
        
        return JsonResponse({
            'success': True,
            'users': users_list
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'detail': f'Ошибка: {str(e)}'
        }, status=500)

@api_view(['GET'])
def get_users_stats(request):
    """Получить статистику пользователей"""
    try:
        if not request.session.get('is_authenticated'):
            return JsonResponse({'detail': 'Требуется авторизация'}, status=401)
        
        try:
            current_user = User.objects.get(student_code=request.session.get('student_code'))
        except User.DoesNotExist:
            return JsonResponse({'detail': 'Пользователь не найден'}, status=404)
        
        # Проверяем что текущий пользователь - администратор
        from .models import Administration
        if not Administration.objects.filter(administrator=current_user, is_active=True).exists():
            return JsonResponse({'detail': 'Доступ запрещен'}, status=403)
        
        total_users = User.objects.count()
        
        # Получаем количество заблокированных пользователей через BanService
        from .ban_service import BanService
        banned_count = 0
        active_count = 0
        
        for user in User.objects.all():
            ban_status = BanService.check_ban_status(user.student_code)
            if ban_status['is_banned']:
                banned_count += 1
            else:
                active_count += 1
        
        # Считаем новых пользователей за сегодня
        import time
        today_timestamp = int(time.time())
        today_start = today_timestamp - (today_timestamp % 86400)  # Начало дня в Unix timestamp
        new_users_today = User.objects.filter(created_at__gte=today_start).count()
        
        return JsonResponse({
            'success': True,
            'stats': {
                'totalUsers': total_users,
                'bannedUsers': banned_count,
                'activeUsers': active_count,
                'newUsersToday': new_users_today
            }
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'detail': f'Ошибка: {str(e)}'
        }, status=500)

@api_view(['POST'])
def create_user(request):
    """Создать нового пользователя"""
    try:
        if not request.session.get('is_authenticated'):
            return JsonResponse({'detail': 'Требуется авторизация'}, status=401)
        
        try:
            current_user = User.objects.get(student_code=request.session.get('student_code'))
        except User.DoesNotExist:
            return JsonResponse({'detail': 'Пользователь не найден'}, status=404)
        
        # Проверяем что текущий пользователь - администратор
        from .models import Administration
        if not Administration.objects.filter(administrator=current_user, is_active=True).exists():
            return JsonResponse({'detail': 'Доступ запрещен'}, status=403)
        
        data = json.loads(request.body)
        
        required_fields = ['fullname', 'student_code', 'faculty', 'password']
        for field in required_fields:
            if not data.get(field):
                return JsonResponse({
                    'success': False,
                    'detail': f'Поле {field} обязательно'
                }, status=400)
        
        if not re.match(r'^\d{10}$', data['student_code']):
            return JsonResponse({
                'success': False,
                'detail': 'Код студента должен состоять из 10 цифр'
            }, status=400)
        
        if len(data['password']) < 7:
            return JsonResponse({
                'success': False,
                'detail': 'Пароль должен содержать минимум 7 символов'
            }, status=400)
        
        if User.objects.filter(student_code=data['student_code']).exists():
            return JsonResponse({
                'success': False,
                'detail': 'Пользователь с таким кодом студента уже существует'
            }, status=400)
        
        from .views import get_unix_timestamp
        user = User.objects.create(
            fullname=data['fullname'],
            student_code=data['student_code'],
            faculty=data['faculty'],
            bilet_code=data['password'],
            created_at=get_unix_timestamp()
        )
        
        return JsonResponse({
            'success': True,
            'message': f'Пользователь {data["fullname"]} успешно создан'
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'detail': f'Ошибка: {str(e)}'
        }, status=500)

@api_view(['POST'])
def ban_user(request):
    """Забанить пользователя"""
    try:
        if not request.session.get('is_authenticated'):
            return JsonResponse({'detail': 'Требуется авторизация'}, status=401)
        
        try:
            current_user = User.objects.get(student_code=request.session.get('student_code'))
        except User.DoesNotExist:
            return JsonResponse({'detail': 'Пользователь не найден'}, status=404)
        
        # Проверяем что текущий пользователь - администратор
        from .models import Administration
        if not Administration.objects.filter(administrator=current_user, is_active=True).exists():
            return JsonResponse({'detail': 'Доступ запрещен'}, status=403)
        
        data = json.loads(request.body)
        user_id = data.get('user_id')
        reason = data.get('reason', 'Причина не указана')
        duration_days = data.get('duration', 7)
        
        if not user_id:
            return JsonResponse({
                'success': False,
                'detail': 'ID пользователя обязателен'
            }, status=400)
        
        try:
            user_to_ban = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return JsonResponse({
                'success': False,
                'detail': 'Пользователь не найден'
            }, status=404)
        
        duration_seconds = duration_days * 24 * 60 * 60
        
        result = BanService.ban_user(
            student_code=user_to_ban.student_code,
            banned_by_id=current_user.id,
            duration_seconds=duration_seconds,
            reason=reason
        )
        
        if result['success']:
            return JsonResponse({
                'success': True,
                'message': f'Пользователь {user_to_ban.fullname} заблокирован',
                'ban_end_date': result.get('ban_end_date'),
                'ban_duration_seconds': result.get('ban_duration_seconds'),
                'ban_reason': result.get('ban_reason')
            })
        else:
            return JsonResponse({
                'success': False,
                'detail': result['detail']
            }, status=400)
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'detail': f'Ошибка: {str(e)}'
        }, status=500)

@api_view(['POST'])
def unban_user(request):
    """Разбанить пользователя"""
    try:
        if not request.session.get('is_authenticated'):
            return JsonResponse({'detail': 'Требуется авторизация'}, status=401)
        
        try:
            current_user = User.objects.get(student_code=request.session.get('student_code'))
        except User.DoesNotExist:
            return JsonResponse({'detail': 'Пользователь не найден'}, status=404)
        
        # Проверяем что текущий пользователь - администратор
        from .models import Administration
        if not Administration.objects.filter(administrator=current_user, is_active=True).exists():
            return JsonResponse({'detail': 'Доступ запрещен'}, status=403)
        
        data = json.loads(request.body)
        user_id = data.get('user_id')
        
        if not user_id:
            return JsonResponse({
                'success': False,
                'detail': 'ID пользователя обязателен'
            }, status=400)
        
        try:
            user_to_unban = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return JsonResponse({
                'success': False,
                'detail': 'Пользователь не найден'
            }, status=404)
        
        from .ban_service import BanService
        result = BanService.unban_user(
            student_code=user_to_unban.student_code,
            unbanned_by_id=current_user.id
        )
        
        if result['success']:
            return JsonResponse({
                'success': True,
                'message': f'Пользователь {user_to_unban.fullname} разблокирован'
            })
        else:
            return JsonResponse({
                'success': False,
                'detail': result['detail']
            }, status=400)
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'detail': f'Ошибка: {str(e)}'
        }, status=500)
