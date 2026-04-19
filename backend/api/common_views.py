"""
Общие/служебные представления
"""
import logging
from datetime import datetime
from django.http import JsonResponse
from rest_framework.decorators import api_view
from .common.decorators import allow_unverified_2fa

logger = logging.getLogger(__name__)


@allow_unverified_2fa
@api_view(['GET', 'POST', 'HEAD'])
def health_check(request):
    """Endpoint проверки работоспособности"""
    try:
        from .models import User
        user_count = User.objects.count()
        
        return JsonResponse({
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'database': 'connected',
            'users_count': user_count,
            'method': request.method
        })
    except Exception as e:
        return JsonResponse({
            'status': 'unhealthy',
            'timestamp': datetime.now().isoformat(),
            'error': str(e)
        }, status=500)
