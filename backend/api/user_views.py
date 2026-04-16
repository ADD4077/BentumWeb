import json
import logging
import re
from datetime import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from .models import User, Administration
from .ban_service import BanService
from .common.utils import get_user_full_data

logger = logging.getLogger(__name__)


def get_unix_timestamp():
    return int(datetime.now().timestamp())

@api_view(['GET'])
def get_all_users(request):
    """Получить список всех пользователей"""
    try:
        # Проверить права администратора
        if not request.session.get('is_authenticated'):
            return JsonResponse({'detail': 'Требуется авторизация'}, status=401)
        
        student_code = request.session.get('student_code')
        user = User.objects.filter(student_code=student_code).first()
        if not user:
            return JsonResponse({'detail': 'Пользователь не найден'}, status=404)
        
        if not Administration.objects.filter(administrator=user, is_active=True).exists():
            return JsonResponse({'detail': 'Доступ запрещен'}, status=403)
        
        users = User.objects.all().select_related('administration').values('id', 'fullname', 'student_code', 'faculty', 'created_at', 'last_login')
        users_list = list(users)
        
        # Batch check ban status for all users to avoid N+1 queries
        student_codes = [user['student_code'] for user in users_list]
        ban_statuses = {code: BanService.check_ban_status(code) for code in student_codes}
        
        # Пакетная проверка статуса администратора
        admin_ids = set(Administration.objects.filter(is_active=True).values_list('administrator_id', flat=True))
        
        for user in users_list:
            ban_status = ban_statuses[user['student_code']]
            user['status'] = 'banned' if ban_status['is_banned'] else 'active'
            user['is_admin'] = user['id'] in admin_ids
        
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
        if not Administration.objects.filter(administrator=current_user, is_active=True).exists():
            return JsonResponse({'detail': 'Доступ запрещен'}, status=403)
        
        total_users = User.objects.count()
        
        # Пакетная проверка статуса бана для всех пользователей, чтобы избежать N+1 запросов
        from .ban_service import BanService
        all_users = User.objects.all()
        student_codes = [user.student_code for user in all_users]
        ban_statuses = {code: BanService.check_ban_status(code) for code in student_codes}
        
        banned_count = sum(1 for status in ban_statuses.values() if status['is_banned'])
        active_count = total_users - banned_count
        
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
        
        # Проверяем что целевой пользователь не является администратором
        if Administration.objects.filter(administrator=user_to_ban, is_active=True).exists():
            return JsonResponse({
                'success': False,
                'detail': 'Нельзя заблокировать администратора'
            }, status=403)
        
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


@csrf_exempt
@api_view(['GET'])
def get_user_by_code(request, student_code):
    """Получить информацию о пользователе по студенческому коду"""
    try:
        user = User.objects.filter(student_code=student_code).first()
        
        if not user:
            # Предотвратить race condition при сохранении сессии
            request.session.modified = False
            return JsonResponse({
                'success': True,
                'user': None
            })
        
        # Использовать централизованную функцию из utils
        user_data = get_user_full_data(user)
        user_data['status'] = 'banned' if user_data['is_banned'] else 'active'
        
        # Предотвратить race condition при сохранении сессии для endpoint только для чтения
        request.session.modified = False
            
        return JsonResponse({
            'success': True,
            'user': user_data
        })
        
    except Exception as e:
        # Предотвратить сохранение сессии при ошибке тоже
        request.session.modified = False
        return JsonResponse({
            'success': False,
            'detail': f'Ошибка: {str(e)}'
        }, status=500)


@csrf_exempt
@api_view(['GET'])
def get_public_stats(request):
    """Публичный эндпоинт для получения статистики (доступен всем)"""
    if request.method != "GET":
        return JsonResponse(
            {"detail": "Метод не разрешён"},
            status=405
        )
    
    try:
        total_users = User.objects.count()
        
        unique_faculties = User.objects.values_list('faculty', flat=True).distinct()
        faculties_count = len([f for f in unique_faculties if f])
        
        # Batch check ban status for all users to avoid N+1 queries
        all_users = User.objects.all()
        student_codes = [user.student_code for user in all_users]
        ban_statuses = {code: BanService.check_ban_status(code) for code in student_codes}
        banned_count = sum(1 for status in ban_statuses.values() if status['is_banned'])
        
        return JsonResponse({
            "success": True,
            "stats": {
                "totalUsers": total_users,
                "facultiesCount": faculties_count,
                "bannedUsers": banned_count,
                "activeUsers": total_users - banned_count,
                "uptime": "99.9%"
            }
        })
        
    except Exception as e:
        return JsonResponse({
            "success": False,
            "detail": f"Ошибка загрузки статистики: {str(e)}"
        }, status=500)


@csrf_exempt
def email_binding_status(request):
    """Получить статус привязки email для текущего пользователя"""
    try:
        if request.method != "GET":
            return JsonResponse(
                {"success": False, "detail": "Method not allowed"},
                status=405
            )
        
        if not request.session.get('is_authenticated'):
            return JsonResponse(
                {"success": False, "detail": "Authorization required"},
                status=401
            )
        
        student_code = request.session.get('student_code')
        if not student_code:
            return JsonResponse(
                {"success": False, "detail": "Student code not found in session"},
                status=401
            )
        
        user = User.objects.filter(student_code=student_code).first()
        if not user:
            return JsonResponse(
                {"success": False, "detail": "User not found"},
                status=404
            )
        
        if user.email:
            return JsonResponse({
                "success": True,
                "data": {
                    "is_linked": True,
                    "email": user.email
                }
            })
        else:
            return JsonResponse({
                "success": True,
                "data": {
                    "is_linked": False,
                    "email": None
                }
            })
            
    except Exception as e:
        logger.error(f"Error getting email binding status: {e}")
        return JsonResponse({
            "success": False,
            "detail": "Error checking email binding status"
        }, status=500)


@csrf_exempt
def email_bind(request):
    """Привязать email к аккаунту пользователя"""
    try:
        if request.method != "POST":
            return JsonResponse(
                {"success": False, "detail": "Method not allowed"},
                status=405
            )
        
        if not request.session.get('is_authenticated'):
            return JsonResponse(
                {"success": False, "detail": "Authorization required"},
                status=401
            )
        
        student_code = request.session.get('student_code')
        if not student_code:
            return JsonResponse(
                {"success": False, "detail": "Student code not found in session"},
                status=401
            )
        
        user = User.objects.filter(student_code=student_code).first()
        if not user:
            return JsonResponse(
                {"success": False, "detail": "User not found"},
                status=404
            )
        
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse(
                {"success": False, "detail": "Invalid JSON"},
                status=400
            )
        
        email = data.get('email', '').strip()
        
        if not email or '@' not in email:
            return JsonResponse(
                {"success": False, "detail": "Invalid email address"},
                status=400
            )
        
        existing_user = User.objects.filter(email=email).exclude(id=user.id).first()
        if existing_user:
            return JsonResponse(
                {"success": False, "detail": "Email already used by another account"},
                status=400
            )
        
        user.email = email
        user.save(update_fields=['email'])
        
        logger.info(f"Email {email} bound to user {student_code}")
        
        return JsonResponse({
            "success": True,
            "message": "Email successfully bound",
            "data": {
                "is_linked": True,
                "email": email
            }
        })
            
    except Exception as e:
        logger.error(f"Error binding email: {e}")
        return JsonResponse({
            "success": False,
            "detail": "Error binding email"
        }, status=500)

