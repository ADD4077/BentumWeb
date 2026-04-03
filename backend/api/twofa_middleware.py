import logging
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from .twofa_service import twofa_service

logger = logging.getLogger(__name__)

class TwoFAAuthenticationMiddleware(MiddlewareMixin):
    """
    Middleware для проверки двухфакторной аутентификации
    Блокирует все API запросы, пока 2FA не пройдена
    """
    
    # Пути, которые не требуют проверки 2FA
    WHITELIST_PATHS = [
        '/api/auth/check',
        '/api/logout',
        '/api/2fa/verify',
        '/api/2fa/config',
        '/api/2fa/resend',
        '/api/telegram/generate-link',
        '/api/telegram/binding-status',
        '/api/telegram/unlink',
        '/api/telegram/bind',
    ]
    
    def process_request(self, request):
        # Пропускаем не-API запросы
        if not request.path.startswith('/api/'):
            return None
        
        # Пропускаем whitelisted пути
        if request.path in self.WHITELIST_PATHS:
            return None
        
        # Проверяем, что пользователь аутентифицирован
        session = getattr(request, 'session', None)
        if not session or not session.get('is_authenticated'):
            return None  # Пусть обрабатывает стандартная аутентификация
        
        # Если 2FA уже пройдена, пропускаем
        if session.get('twofa_verified', False):
            return None
        
        # Проверяем, требуется ли 2FA для этого пользователя
        student_code = session.get('student_code')
        if not student_code:
            return None
        
        try:
            from .models import User
            user = User.objects.filter(student_code=student_code).first()
            
            if not user:
                return None
            
            # Если 2FA не включена для пользователя, пропускаем
            if not twofa_service.is_2fa_required(user):
                # Устанавливаем флаг, что 2FA не требуется
                session['twofa_verified'] = True
                session.save()
                return None
            
            # Если это не pending сессия, значит пользователь уже прошел 2FA ранее
            if not session.get('twofa_pending', False):
                session['twofa_verified'] = True
                session.save()
                return None
            
            # 2FA требуется, но еще не пройдена - блокируем запрос
            return JsonResponse({
                "success": False,
                "requires_2fa": True,
                "detail": "Требуется двухфакторная аутентификация"
            }, status=403)
            
        except Exception as e:
            logger.error(f"Error in 2FA middleware for user {student_code}: {e}")
            # В случае ошибки, пропускаем запрос, чтобы не блокировать систему
            return None
