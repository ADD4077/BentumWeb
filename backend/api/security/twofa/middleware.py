from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin

class TwoFAAuthenticationMiddleware(MiddlewareMixin):
    """
    Middleware для обработки 2FA аутентификации
    Блокирует доступ к защищенным endpoint если 2FA не подтвержден
    """
    
    def process_request(self, request):
        # Пропускаем проверку 2FA для:
        # 1. Endpoint входа (пользователям нужно сначала войти)
        # 2. Endpoint 2FA (пользователям нужно подтвердить/включить 2FA)
        # 3. Публичные endpoint (проверка работоспособности и т.д.)
        # 4. Статические файлы
        # 5. Админ панель
        
        skip_paths = [
            '/api/save_data',
            '/api/2fa/',
            '/api/telegram/',
            '/api/support/',
            '/api/public/',
            '/api/health',
            '/api/auth/check',
            '/api/user/by-code/',
            '/api/logout',
            '/api/news',
            '/api/literature',
            '/api/schedule',
            '/admin/',
            '/static/',
            '/media/',
        ]
        
        # Пропускаем если путь начинается с любого пути для пропуска
        if any(request.path.startswith(path) for path in skip_paths):
            return None
        
        # Проверяем, авторизован ли пользователь
        if not request.session.get('is_authenticated'):
            return None
        
        # Проверяем, требуется ли 2FA для этого пользователя
        student_code = request.session.get('student_code')
        if not student_code:
            return None
        
        try:
            from ...models import User
            user = User.objects.filter(student_code=student_code).first()
            if not user:
                return None
            
            # Если 2FA не включен для этого пользователя, разрешаем доступ
            if not getattr(user, 'twofa_enabled', False):
                return None
            
            # Если 2FA включен, проверяем подтвержден ли он
            if not request.session.get('twofa_verified', False):
                return JsonResponse({
                    'success': False,
                    'detail': 'Требуется подтверждение 2FA',
                    'requires_2fa': True
                }, status=403)
            
            return None
            
        except Exception:
            # Если есть ошибка, разрешаем доступ (fail open)
            return None
    
    def process_response(self, request, response):
        return response
