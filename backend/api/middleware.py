import time
from django.utils import timezone
from django.middleware.csrf import get_token
from django.utils.deprecation import MiddlewareMixin
from .models import User

class DisableCSRFMiddleware(MiddlewareMixin):
    """
    Middleware to disable CSRF for all API requests
    """
    
    def process_request(self, request):
        # Disable CSRF for all API requests
        if request.path.startswith('/api/'):
            setattr(request, '_dont_enforce_csrf_checks', True)

class UpdateLastLoginMiddleware:
    """
    Middleware для обновления last_login при каждом API запросе
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        
        # Кэш для предотвращения слишком частых обновлений
        self.last_update_cache = {}
        self.MIN_UPDATE_INTERVAL = 300  # 5 минут в секундах
    
    def __call__(self, request):
        # Проверяем, что это API запрос и пользователь аутентифицирован
        if self._should_update_last_login(request):
            self._update_user_last_login(request)
        
        response = self.get_response(request)
        return response
    
    def _should_update_last_login(self, request) -> bool:
        """Проверяем нужно ли обновлять last_login для этого запроса"""
        
        # Только для API запросов
        if not request.path.startswith('/api/'):
            return False
        
        # Только для аутентифицированных пользователей
        session = getattr(request, 'session', None)
        if not session or not session.get('is_authenticated'):
            return False
        
        student_code = session.get('student_code')
        if not student_code:
            return False
        
        # Проверяем, не обновляли ли мы недавно (для производительности)
        current_time = time.time()
        last_update = self.last_update_cache.get(student_code, 0)
        
        if current_time - last_update < self.MIN_UPDATE_INTERVAL:
            return False
        
        return True
    
    def _update_user_last_login(self, request):
        """Обновляем last_login пользователя"""
        
        student_code = request.session.get('student_code')
        if not student_code:
            return
        
        try:
            # Обновляем last_login в базе данных
            updated = User.objects.filter(
                student_code=student_code
            ).update(
                last_login=int(timezone.now().timestamp())
            )
            
            if updated > 0:
                # Обновляем кэш
                self.last_update_cache[student_code] = time.time()
                
                # Обновляем в сессии тоже для консистентности
                request.session['last_login'] = int(timezone.now().timestamp())
                request.session.save()
                
        except Exception as e:
            # Логируем ошибку, но не прерываем запрос
            print(f"Error updating last_login for {student_code}: {e}")
