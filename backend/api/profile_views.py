import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .models import User
from django.contrib.sessions.models import Session

@csrf_exempt
@require_http_methods(["POST", "GET"])
def update_profile(request):
    """Обновление профиля пользователя"""
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
        
        if request.method == "GET":
            # Получаем активные медиа файлы
            avatar_url = None
            banner_url = None
            
            from .models import UserProfileMedia
            from .media_service import MediaStorage
            
            # Активный аватар
            active_avatar = UserProfileMedia.objects.filter(
                user=user, 
                media_type='avatar', 
                is_active=True
            ).first()
            if active_avatar:
                avatar_url = MediaStorage.get_media_url(active_avatar, 'medium')
            
            # Активный баннер
            active_banner = UserProfileMedia.objects.filter(
                user=user, 
                media_type='banner', 
                is_active=True
            ).first()
            if active_banner:
                banner_url = MediaStorage.get_media_url(active_banner, 'medium')
            
            # Возвращаем текущие данные пользователя с медиа
            return JsonResponse({
                "success": True,
                "user": {
                    "fullname": user.fullname,
                    "faculty": user.faculty,
                    "student_code": user.student_code,
                    "bilet_code": user.bilet_code,
                    "created_at": user.created_at.isoformat(),
                    "avatar_url": avatar_url,
                    "banner_url": banner_url
                }
            })
        
        elif request.method == "POST":
            # Обновление медиа профиля
            try:
                data = json.loads(request.body)
            except json.JSONDecodeError:
                return JsonResponse({
                    "success": False,
                    "detail": "Некорректный JSON"
                }, status=400)
            
            # Получаем только медиа URL
            avatar_url = data.get('avatar_url')
            banner_url = data.get('banner_url')
            
            # Получаем активные медиа файлы
            avatar_url = None
            banner_url = None
            
            from .models import UserProfileMedia
            from .media_service import MediaStorage
            
            # Активный аватар
            active_avatar = UserProfileMedia.objects.filter(
                user=user, 
                media_type='avatar', 
                is_active=True
            ).first()
            if active_avatar:
                avatar_url = MediaStorage.get_media_url(active_avatar, 'medium')
            
            # Активный баннер
            active_banner = UserProfileMedia.objects.filter(
                user=user, 
                media_type='banner', 
                is_active=True
            ).first()
            if active_banner:
                banner_url = MediaStorage.get_media_url(active_banner, 'medium')
            
            updated_user = {
                "fullname": user.fullname,
                "faculty": user.faculty,
                "student_code": user.student_code,
                "bilet_code": user.bilet_code,
                "created_at": user.created_at.isoformat(),
                "avatar_url": avatar_url,
                "banner_url": banner_url
            }
            
            return JsonResponse({
                "success": True,
                "message": "Медиа успешно обновлено",
                "user": updated_user
            })
            
    except Exception as e:
        return JsonResponse({
            "success": False,
            "detail": f"Ошибка сервера: {str(e)}"
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def update_avatar(request):
    """Обновление аватара пользователя"""
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
        
        # Здесь будет логика сохранения аватара
        # Пока возвращаем заглушку
        return JsonResponse({
            "success": True,
            "message": "Аватар успешно обновлен",
            "url": "https://i.pinimg.com/736x/fc/55/e6/fc55e68d174bf0d2cb038d699c01f172.jpg"
        })
        
    except Exception as e:
        return JsonResponse({
            "success": False,
            "detail": f"Ошибка сервера: {str(e)}"
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def update_banner(request):
    """Обновление баннера пользователя"""
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
        
        # Здесь будет логика сохранения баннера
        # Пока возвращаем заглушку
        return JsonResponse({
            "success": True,
            "message": "Баннер успешно обновлен",
            "url": "https://i.pinimg.com/1200x/b3/40/bd/b340bd28445da4ab7609576bc3fc125f.jpg"
        })
        
    except Exception as e:
        return JsonResponse({
            "success": False,
            "detail": f"Ошибка сервера: {str(e)}"
        }, status=500)
