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
            # Получаем активные медиа файлы или плейсхолдеры
            avatar_url = None
            banner_url = None
            avatar_placeholder = None
            banner_placeholder = None
            
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
            else:
                # Используем CSS плейсхолдер
                avatar_placeholder = MediaStorage.get_placeholder_data(user, 'avatar')
            
            # Активный баннер
            active_banner = UserProfileMedia.objects.filter(
                user=user, 
                media_type='banner', 
                is_active=True
            ).first()
            if active_banner:
                banner_url = MediaStorage.get_media_url(active_banner, 'medium')
            else:
                # Используем CSS плейсхолдер
                banner_placeholder = MediaStorage.get_placeholder_data(user, 'banner')
            
            # Возвращаем текущие данные пользователя с медиа
            return JsonResponse({
                "success": True,
                "user": {
                    "fullname": user.fullname,
                    "faculty": user.faculty,
                    "student_code": user.student_code,
                    "bilet_code": user.bilet_code,
                    "created_at": user.created_at,
                    "avatar_url": avatar_url,
                    "banner_url": banner_url,
                    "avatar_placeholder": avatar_placeholder,
                    "banner_placeholder": banner_placeholder
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
            
            # Получаем активные медиа файлы или плейсхолдеры
            avatar_url = None
            banner_url = None
            avatar_placeholder = None
            banner_placeholder = None
            
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
            else:
                # Используем CSS плейсхолдер
                avatar_placeholder = MediaStorage.get_placeholder_data(user, 'avatar')
            
            # Активный баннер
            active_banner = UserProfileMedia.objects.filter(
                user=user, 
                media_type='banner', 
                is_active=True
            ).first()
            if active_banner:
                banner_url = MediaStorage.get_media_url(active_banner, 'medium')
            else:
                # Используем CSS плейсхолдер
                banner_placeholder = MediaStorage.get_placeholder_data(user, 'banner')
            
            updated_user = {
                "fullname": user.fullname,
                "faculty": user.faculty,
                "student_code": user.student_code,
                "bilet_code": user.bilet_code,
                "created_at": user.created_at,
                "avatar_url": avatar_url,
                "banner_url": banner_url,
                "avatar_placeholder": avatar_placeholder,
                "banner_placeholder": banner_placeholder
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
        # Пока возвращаем CSS плейсхолдер
        from .media_service import MediaStorage
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
        # Пока возвращаем CSS плейсхолдер
        from .media_service import MediaStorage
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
        data = json.loads(request.body)
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        confirm_password = data.get('confirm_password')
        
        # Валидация
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
        
        # Проверяем текущий пароль (хранится в bilet_code)
        if user.bilet_code != current_password:
            return JsonResponse({
                "success": False,
                "detail": "Текущий пароль указан неверно"
            }, status=400)
        
        # Устанавливаем новый пароль в поле bilet_code
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
