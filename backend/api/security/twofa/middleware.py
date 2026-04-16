from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin

class TwoFAAuthenticationMiddleware(MiddlewareMixin):
    """
    Middleware for handling 2FA authentication
    Blocks access to protected endpoints if 2FA is not verified
    """
    
    def process_request(self, request):
        # Skip 2FA check for:
        # 1. Login endpoint (users need to login first)
        # 2. 2FA endpoints (users need to verify/enable 2FA)
        # 3. Public endpoints (health check, etc.)
        # 4. Static files
        # 5. Admin panel
        
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
        
        # Skip if path starts with any skip path
        if any(request.path.startswith(path) for path in skip_paths):
            return None
        
        # Check if user is authenticated
        if not request.session.get('is_authenticated'):
            return None
        
        # Check if 2FA is required for this user
        student_code = request.session.get('student_code')
        if not student_code:
            return None
        
        try:
            from ...models import User
            user = User.objects.filter(student_code=student_code).first()
            if not user:
                return None
            
            # If 2FA is not enabled for this user, allow access
            if not getattr(user, 'twofa_enabled', False):
                return None
            
            # If 2FA is enabled, check if it's verified
            if not request.session.get('twofa_verified', False):
                return JsonResponse({
                    'success': False,
                    'detail': '2FA verification required',
                    'requires_2fa': True
                }, status=403)
            
            return None
            
        except Exception:
            # If there's any error, allow access (fail open)
            return None
    
    def process_response(self, request, response):
        return response
