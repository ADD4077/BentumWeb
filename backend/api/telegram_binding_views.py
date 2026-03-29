import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
import logging
from django.conf import settings
from .models import User
from .telegram_binding_service import telegram_binding_service

logger = logging.getLogger(__name__)

@csrf_exempt
@require_http_methods(["POST"])
def generate_telegram_link(request):
    """Генерирует ссылку для привязки Telegram"""
    
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
        
        # Проверяем, есть ли уже привязка
        existing_binding = telegram_binding_service.get_user_binding(user)
        if existing_binding:
            return JsonResponse({
                "success": False,
                "detail": "Telegram аккаунт уже привязан",
                "binding": {
                    "telegram_username": existing_binding.telegram_username,
                    "telegram_first_name": existing_binding.telegram_first_name,
                    "telegram_last_name": existing_binding.telegram_last_name,
                    "linked_at": existing_binding.created_at.isoformat()
                }
            }, status=400)
        
        # Генерируем токен и ссылку
        token = telegram_binding_service.generate_binding_token(user)
        link = telegram_binding_service.get_binding_link_sync(token)
        
        return JsonResponse({
            "success": True,
            "data": {
                "token": token,
                "link": link,
                "expires_in": 86400  # 24 часа в секундах
            }
        })
        
    except Exception as e:
        logger.error(f"Error generating Telegram link for user {student_code}: {e}")
        return JsonResponse({
            "success": False,
            "detail": "Внутренняя ошибка сервера"
        }, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_telegram_binding_status(request):
    """Получает статус привязки Telegram"""
    
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
        
        binding = telegram_binding_service.get_user_binding(user)
        
        if binding:
            return JsonResponse({
                "success": True,
                "data": {
                    "is_linked": True,
                    "telegram_username": binding.telegram_username,
                    "telegram_first_name": binding.telegram_first_name,
                    "telegram_last_name": binding.telegram_last_name,
                    "linked_at": binding.created_at.isoformat()
                }
            })
        else:
            return JsonResponse({
                "success": True,
                "data": {
                    "is_linked": False
                }
            })
        
    except Exception as e:
        logger.error(f"Error getting Telegram binding status for user {student_code}: {e}")
        return JsonResponse({
            "success": False,
            "detail": "Внутренняя ошибка сервера"
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def unlink_telegram_account(request):
    """Отвязывает Telegram аккаунт"""
    
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
        
        success, message = telegram_binding_service.unlink_telegram_account(user)
        
        if success:
            return JsonResponse({
                "success": True,
                "message": message
            })
        else:
            return JsonResponse({
                "success": False,
                "detail": message
            }, status=400)
        
    except Exception as e:
        logger.error(f"Error unlinking Telegram account for user {student_code}: {e}")
        return JsonResponse({
            "success": False,
            "detail": "Внутренняя ошибка сервера"
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def process_telegram_callback(request):
    """Обрабатывает callback от Telegram бота для привязки аккаунта"""
    
    try:
        data = json.loads(request.body)
        
        token = data.get('token')
        telegram_data = data.get('telegram_data')
        
        if not token or not telegram_data:
            return JsonResponse({
                "success": False,
                "detail": "Missing required parameters: token and telegram_data"
            }, status=400)
        
        # Валидация данных Telegram
        required_fields = ['id']
        for field in required_fields:
            if field not in telegram_data:
                return JsonResponse({
                    "success": False,
                    "detail": f"Missing required field in telegram_data: {field}"
                }, status=400)
        
        success, message = telegram_binding_service.bind_telegram_account_sync(token, telegram_data)
        
        if success:
            return JsonResponse({
                "success": True,
                "message": message
            })
        else:
            return JsonResponse({
                "success": False,
                "detail": message
            }, status=400)
        
    except json.JSONDecodeError:
        return JsonResponse({
            "success": False,
            "detail": "Invalid JSON data"
        }, status=400)
    except Exception as e:
        logger.error(f"Error processing Telegram callback: {e}")
        return JsonResponse({
            "success": False,
            "detail": "Внутренняя ошибка сервера"
        }, status=500)
