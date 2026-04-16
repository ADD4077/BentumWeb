import logging
import json
from datetime import timedelta
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone

from ...models import User, TelegramBinding
from ...telegram_binding_service import TelegramBindingService

# Создаем экземпляр сервиса
telegram_binding_service = TelegramBindingService()

logger = logging.getLogger(__name__)

@csrf_exempt
@require_http_methods(["POST"])
def generate_telegram_link(request):
    """Сгенерировать ссылку для привязки Telegram"""
    try:
        # Check authorization using session
        is_authenticated = request.session.get('is_authenticated')
        student_code = request.session.get('student_code')
        
        if not is_authenticated:
            return JsonResponse({
                "success": False,
                "detail": "Требуется авторизация"
            }, status=401)
        
        if not student_code:
            logger.warning("Код студента не найден в сессии")
            return JsonResponse({
                "success": False,
                "detail": "Код студента не найден в сессии"
            }, status=401)
        
        user = User.objects.filter(student_code=student_code).first()
        
        if not user:
            logger.warning(f"Пользователь не найден для student_code: {student_code}")
            return JsonResponse({
                "success": False,
                "detail": "Пользователь не найден"
            }, status=404)
        
        # Проверяем, уже ли привязан
        existing_binding = telegram_binding_service.get_user_binding(user)
        if existing_binding:
            return JsonResponse({
                "success": False,
                "detail": "Telegram аккаунт уже привязан"
            }, status=400)
        
        # Генерируем новую ссылку
        token = telegram_binding_service.generate_binding_token(user)
        
        if token:
            binding_link = telegram_binding_service.get_binding_link_sync(token)
            return JsonResponse({
                "success": True,
                "data": {
                    "binding_link": binding_link,
                    "expires_at": (timezone.now() + timedelta(hours=24)).isoformat()
                }
            })
        else:
            return JsonResponse({
                "success": False,
                "detail": "Не удалось сгенерировать токен привязки"
            }, status=500)
            
    except Exception as e:
        logger.error(f"Ошибка генерации ссылки Telegram: {str(e)}")
        return JsonResponse({
            "success": False,
            "detail": "Внутренняя ошибка сервера"
        }, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_telegram_binding_status(request):
    """Получить статус привязки Telegram"""
    
    try:
        # Проверяем авторизацию через сессию (как и другие endpoints)
        if not request.session.get('is_authenticated'):
            return JsonResponse({
                "success": False,
                "detail": "Требуется авторизация"
            }, status=401)
        
        student_code = request.session.get('student_code')
        if not student_code:
            return JsonResponse({
                "success": False,
                "detail": "Код студента не найден в сессии"
            }, status=401)
        
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
        logger.error(f"Ошибка получения статуса привязки Telegram: {str(e)}")
        return JsonResponse({
            "success": False,
            "detail": "Внутренняя ошибка сервера"
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def unlink_telegram_account(request):
    """Отвязать Telegram аккаунт"""
    try:
        # Check authorization using session
        if not request.session.get('is_authenticated'):
            return JsonResponse({
                "success": False,
                "detail": "Требуется авторизация"
            }, status=401)
        
        student_code = request.session.get('student_code')
        if not student_code:
            return JsonResponse({
                "success": False,
                "detail": "Код студента не найден в сессии"
            }, status=401)
        
        user = User.objects.filter(student_code=student_code).first()
        
        if not user:
            return JsonResponse({
                "success": False,
                "detail": "Пользователь не найден"
            }, status=404)
        
        ok, message = telegram_binding_service.unlink_telegram_account(user)

        if ok:
            return JsonResponse({
                "success": True,
                "data": {
                    "message": message
                }
            })

        return JsonResponse({
            "success": False,
            "detail": message
        }, status=400)
            
    except Exception as e:
        logger.error(f"Ошибка отвязки Telegram аккаунта: {str(e)}")
        return JsonResponse({
            "success": False,
            "detail": "Внутренняя ошибка сервера"
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def process_telegram_callback(request):
    """Привязать Telegram аккаунт по токену (вызывается ботом)"""
    try:
        try:
            payload = json.loads(request.body.decode('utf-8') or '{}')
        except Exception:
            payload = {}

        token = payload.get('token')
        telegram_data = payload.get('telegram')

        if not token:
            return JsonResponse({
                "success": False,
                "detail": "Токен не предоставлен"
            }, status=400)

        if not isinstance(telegram_data, dict):
            return JsonResponse({
                "success": False,
                "detail": "Данные Telegram не предоставлены"
            }, status=400)

        ok, message = telegram_binding_service.bind_telegram_account_sync(token, telegram_data)

        if ok:
            return JsonResponse({
                "success": True,
                "data": {
                    "message": message
                }
            })

        return JsonResponse({
            "success": False,
            "detail": message
        }, status=400)
            
    except Exception as e:
        logger.error(f"Ошибка обработки Telegram callback: {str(e)}")
        return JsonResponse({
            "success": False,
            "detail": "Внутренняя ошибка сервера"
        }, status=500)
