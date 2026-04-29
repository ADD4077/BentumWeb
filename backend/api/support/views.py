import json
import logging

from django.conf import settings
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_http_methods
from ..background_jobs import BackgroundJobService, BackgroundJobType
from ..common.decorators import allow_unverified_2fa
from ..models import User
from ..telegram_service import TelegramService
from ..user_notification_service import UserNotificationService

logger = logging.getLogger(__name__)

# Глобальный экземпляр сервиса
telegram_service = TelegramService()

@allow_unverified_2fa
@require_http_methods(["POST"])
def submit_support_request(request):
    """Обработка заявки в поддержку"""
    
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
        
        # Получаем данные из запроса
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({
                "success": False,
                "detail": "Неверный формат JSON"
            }, status=400)
        
        message = data.get('message', '').strip()
        request_type = data.get('type', 'support')  # support, bug, feature, question
        
        # Валидация
        if not message:
            return JsonResponse({
                "success": False,
                "detail": "Сообщение не может быть пустым"
            }, status=400)
        
        if len(message) > 512:
            return JsonResponse({
                "success": False,
                "detail": "Сообщение слишком длинное (максимум 512 символов)"
            }, status=400)
        
        if request_type not in ['support', 'bug', 'feature', 'question']:
            request_type = 'support'
        
        # Подготавливаем данные пользователя
        user_data = {
            'fullname': user.fullname,
            'student_code': user.student_code,
            'faculty': user.faculty,
            'created_at': timezone.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        BackgroundJobService.enqueue(
            BackgroundJobType.SUPPORT_REQUEST_NOTIFICATION,
            {
                "user_data": user_data,
                "message": message,
                "request_type": request_type,
            },
        )

        logger.info("Support request from %s queued for background delivery", user.student_code)
        return JsonResponse({
            "success": True,
            "message": "Заявка принята и поставлена в очередь на отправку"
        })
            
    except Exception as e:
        logger.error(f"Error processing support request: {e}")
        return JsonResponse({
            "success": False,
            "detail": "Внутренняя ошибка сервера"
        }, status=500)

@allow_unverified_2fa
@require_http_methods(["GET"])
def test_telegram_connection(request):
    """Тест соединения с Telegram (только для разработки)"""
    
    # Проверка что это режим разработки
    if not settings.DEBUG:
        return JsonResponse({
            "success": False,
            "detail": "Доступно только в режиме разработки"
        }, status=403)
    
    try:
        is_connected, message = telegram_service.test_connection_sync()
        
        return JsonResponse({
            "success": is_connected,
            "message": message,
            "bot_configured": bool(getattr(settings, 'TELEGRAM_BOT_TOKEN', None)),
            "chat_configured": bool(getattr(settings, 'TELEGRAM_CHAT_ID', None)),
            "topic_id": getattr(settings, 'TELEGRAM_TOPIC_ID', None),
            "topic_configured": bool(getattr(settings, 'TELEGRAM_TOPIC_ID', None))
        })
        
    except Exception:
        logger.exception("Error testing Telegram connection")
        return JsonResponse({
            "success": False,
            "detail": "Внутренняя ошибка сервера"
        }, status=500)

@allow_unverified_2fa
@require_http_methods(["GET"])
def test_new_user_notification(request):
    """Тестирование уведомлений о новых пользователях"""
    
    from django.conf import settings
    
    if not settings.DEBUG:
        return JsonResponse({'error': 'Доступно только в режиме DEBUG'}, status=403)
    
    try:
        notification_service = UserNotificationService()
        result = notification_service.test_connection()
        
        return JsonResponse(result)
        
    except Exception:
        logger.exception("Error testing new user notification")
        return JsonResponse({
            'success': False,
            'error': 'Внутренняя ошибка сервера'
        }, status=500)

@allow_unverified_2fa
@require_http_methods(["POST"])
def send_new_user_notification(request):
    """Отправка уведомления о новом пользователе"""
    
    try:
        # Получаем данные пользователя из запроса
        data = json.loads(request.body)
        
        # Проверяем обязательные поля
        required_fields = ['fullname', 'student_code']
        for field in required_fields:
            if not data.get(field):
                return JsonResponse({
                    'success': False,
                    'error': f'Отсутствует обязательное поле: {field}'
                }, status=400)
        
        BackgroundJobService.enqueue(
            BackgroundJobType.NEW_USER_NOTIFICATION,
            {'user_data': data},
        )

        return JsonResponse({
            'success': True,
            'message': 'Уведомление о новом пользователе поставлено в очередь'
        })
            
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Неверный формат JSON данных'
        }, status=400)
    except Exception:
        logger.exception("Error sending new user notification")
        return JsonResponse({
            'success': False,
            'error': 'Внутренняя ошибка сервера'
        }, status=500)
