"""
Общие/служебные представления
"""
import logging
from datetime import datetime
from django.http import JsonResponse
from rest_framework.decorators import api_view

logger = logging.getLogger(__name__)


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
