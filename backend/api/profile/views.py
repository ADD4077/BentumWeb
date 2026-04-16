import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from ..models import User
from ..common.utils import get_current_user, get_user_media

@csrf_exempt
@require_http_methods(["POST", "GET"])
def update_profile(request):
    """Обновление профиля пользователя"""
    try:
        if not request.session.get('is_authenticated'):
            return JsonResponse({
                "success": False,
                "detail": "Требуется авторизация"
            }, status=401)
        
        user = get_current_user(request)
        if not user:
            return JsonResponse({
                "success": False,
                "detail": "Пользователь не найден"
            }, status=404)
        
        media = get_user_media(user)
        
        if request.method == "GET":
            return JsonResponse({
                "success": True,
                "user": {
                    "fullname": user.fullname,
                    "faculty": user.faculty,
                    "student_code": user.student_code,
                    "bilet_code": user.bilet_code,
                    "created_at": user.created_at,
                    **media
                }
            })
        
        elif request.method == "POST":
            return JsonResponse({
                "success": True,
                "message": "Медиа успешно обновлено",
                "user": {
                    "fullname": user.fullname,
                    "faculty": user.faculty,
                    "student_code": user.student_code,
                    "bilet_code": user.bilet_code,
                    "created_at": user.created_at,
                    **media
                }
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
        if not request.session.get('is_authenticated'):
            return JsonResponse({
                "success": False,
                "detail": "Требуется авторизация"
            }, status=401)
        
        user = get_current_user(request)
        if not user:
            return JsonResponse({
                "success": False,
                "detail": "Пользователь не найден"
            }, status=404)
        
        from ..media_service import MediaStorage
        avatar_placeholder = MediaStorage.get_placeholder_data(user, 'avatar')
        
        return JsonResponse({
            "success": True,
            "message": "Аватар успешно обновлен",
            "avatar_url": None,
            "avatar_placeholder": avatar_placeholder
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
        if not request.session.get('is_authenticated'):
            return JsonResponse({
                "success": False,
                "detail": "Требуется авторизация"
            }, status=401)
        
        user = get_current_user(request)
        if not user:
            return JsonResponse({
                "success": False,
                "detail": "Пользователь не найден"
            }, status=404)
        
        from ..media_service import MediaStorage
        banner_placeholder = MediaStorage.get_placeholder_data(user, 'banner')
        
        return JsonResponse({
            "success": True,
            "message": "Баннер успешно обновлен",
            "banner_url": None,
            "banner_placeholder": banner_placeholder
        })
        
    except Exception as e:
        return JsonResponse({
            "success": False,
            "detail": f"Ошибка сервера: {str(e)}"
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def change_password(request):
    """Смена пароля пользователя"""
    try:
        if not request.session.get('is_authenticated'):
            return JsonResponse({
                "success": False,
                "detail": "Требуется авторизация"
            }, status=401)
        
        user = get_current_user(request)
        if not user:
            return JsonResponse({
                "success": False,
                "detail": "Пользователь не найден"
            }, status=404)
        
        data = json.loads(request.body)
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        confirm_password = data.get('confirm_password')
        
        if not current_password or not new_password or not confirm_password:
            return JsonResponse({
                "success": False,
                "detail": "Все поля обязательны для заполнения"
            }, status=400)
        
        if new_password != confirm_password:
            return JsonResponse({
                "success": False,
                "detail": "Новые пароли не совпадают"
            }, status=400)
        
        if len(new_password) < 7:
            return JsonResponse({
                "success": False,
                "detail": "Пароль должен содержать минимум 7 символов"
            }, status=400)
        
        if user.bilet_code != current_password:
            return JsonResponse({
                "success": False,
                "detail": "Текущий пароль указан неверно"
            }, status=400)
        
        user.bilet_code = new_password
        user.save()
        
        return JsonResponse({
            "success": True,
            "message": "Пароль успешно изменен"
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            "success": False,
            "detail": "Неверный формат данных"
        }, status=400)
    except Exception as e:
        return JsonResponse({
            "success": False,
            "detail": f"Ошибка сервера: {str(e)}"
        }, status=500)
