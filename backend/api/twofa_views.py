import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.sessions.models import Session
import logging
from .models import User
from .twofa_service import twofa_service

logger = logging.getLogger(__name__)

@csrf_exempt
@require_http_methods(["GET"])
def get_2fa_config(request):
    """Получает текущую конфигурацию 2FA пользователя"""
    
    try:
        # Проверяем авторизацию
        if not request.session.get('is_authenticated'):
            return JsonResponse({
                "success": False,
                "detail": "Требуется авторизация"
            }, status=401)
        
        student_code = request.session.get('student_code')
        user = User.objects.filter(student_code=student_code).first()
        
        if not user:
            return JsonResponse({
                "success": False,
                "detail": "Пользователь не найден"
            }, status=404)
        
        config = twofa_service.get_user_2fa_config(user)
        
        return JsonResponse({
            "success": True,
            "data": config
        })
        
    except Exception as e:
        logger.error(f"Error getting 2FA config for user {student_code}: {e}")
        return JsonResponse({
            "success": False,
            "detail": "Внутренняя ошибка сервера"
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def set_2fa_config(request):
    """Устанавливает конфигурацию 2FA пользователя"""
    
    try:
        # Проверяем авторизацию
        if not request.session.get('is_authenticated'):
            return JsonResponse({
                "success": False,
                "detail": "Требуется авторизация"
            }, status=401)
        
        student_code = request.session.get('student_code')
        user = User.objects.filter(student_code=student_code).first()
        
        if not user:
            return JsonResponse({
                "success": False,
                "detail": "Пользователь не найден"
            }, status=404)
        
        data = json.loads(request.body)
        enabled = data.get('enabled', False)
        method = data.get('method')
        
        success, message = twofa_service.set_user_2fa_config(user, enabled, method)
        
        if success:
            return JsonResponse({
                "success": True,
                "message": message,
                "data": twofa_service.get_user_2fa_config(user)
            })
        else:
            return JsonResponse({
                "success": False,
                "detail": message
            }, status=400)
        
    except json.JSONDecodeError:
        return JsonResponse({
            "success": False,
            "detail": "Некорректный JSON"
        }, status=400)
    except Exception as e:
        logger.error(f"Error setting 2FA config for user {student_code}: {e}")
        return JsonResponse({
            "success": False,
            "detail": "Внутренняя ошибка сервера"
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def verify_2fa(request):
    """Проверяет 2FA код"""
    
    try:
        data = json.loads(request.body)
        code = data.get('code')
        
        if not code:
            return JsonResponse({
                "success": False,
                "detail": "Отсутствует код"
            }, status=400)
        
        # Проверяем авторизацию
        if not request.session.get('is_authenticated'):
            return JsonResponse({
                "success": False,
                "detail": "Требуется авторизация"
            }, status=401)
        
        student_code = request.session.get('student_code')
        user = User.objects.filter(student_code=student_code).first()
        
        if not user:
            return JsonResponse({
                "success": False,
                "detail": "Пользователь не найден"
            }, status=404)
        
        # Проверяем 2FA код
        if twofa_service.verify_2fa_code(student_code, code):
            # Убираем флаг pending из сессии
            request.session['twofa_pending'] = False
            request.session['twofa_verified'] = True
            request.session.save()
            
            return JsonResponse({
                "success": True,
                "message": "2FA успешно пройдена"
            })
        else:
            return JsonResponse({
                "success": False,
                "detail": "Неверный код"
            }, status=400)
        
    except json.JSONDecodeError:
        return JsonResponse({
            "success": False,
            "detail": "Некорректный JSON"
        }, status=400)
    except Exception as e:
        logger.error(f"Error verifying 2FA for user {student_code}: {e}")
        return JsonResponse({
            "success": False,
            "detail": "Внутренняя ошибка сервера"
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def resend_2fa_code(request):
    """Повторно отправляет 2FA код"""
    
    try:
        # Проверяем авторизацию
        if not request.session.get('is_authenticated'):
            return JsonResponse({
                "success": False,
                "detail": "Требуется авторизация"
            }, status=401)
        
        student_code = request.session.get('student_code')
        user = User.objects.filter(student_code=student_code).first()
        
        if not user:
            return JsonResponse({
                "success": False,
                "detail": "Пользователь не найден"
            }, status=404)
        
        # Проверяем, что 2FA включена и метод - telegram
        if not twofa_service.is_2fa_required(user) or user.twofa_method != 'telegram':
            return JsonResponse({
                "success": False,
                "detail": "2FA не настроена"
            }, status=400)
        
        # Генерируем новый код
        code = twofa_service.generate_6fa_code()
        twofa_service.store_2fa_code(student_code, code)
        
        # Отправляем в Telegram
        success, message = twofa_service.send_2fa_code_telegram_sync(user, code)
        
        if success:
            return JsonResponse({
                "success": True,
                "message": message
            })
        else:
            return JsonResponse({
                "success": False,
                "detail": message
            }, status=500)
        
    except Exception as e:
        logger.error(f"Error resending 2FA code for user {student_code}: {e}")
        return JsonResponse({
            "success": False,
            "detail": "Внутренняя ошибка сервера"
        }, status=500)
