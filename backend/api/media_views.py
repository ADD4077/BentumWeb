import json
import os
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.contrib.sessions.models import Session
from django.conf import settings

from .models import User, UserProfileMedia, MediaOptimization
from .media_service import MediaStorage, MediaValidator
from .func import authorize

@csrf_exempt
@require_http_methods(["POST"])
def upload_media(request):
    """Загрузка медиа файла (аватар/баннер)"""
    import logging
    logger = logging.getLogger(__name__)
    
    logger.error(f"=== MEDIA UPLOAD REQUEST ===")
    logger.error(f"Session authenticated: {request.session.get('is_authenticated')}")
    logger.error(f"FILES: {request.FILES}")
    logger.error(f"POST: {request.POST}")
    
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
        
        # Проверяем наличие файла
        if 'file' not in request.FILES:
            return JsonResponse({
                "success": False,
                "detail": "Файл не загружен"
            }, status=400)
        
        file = request.FILES['file']
        media_type = request.POST.get('media_type', 'avatar')
        
        if media_type not in ['avatar', 'banner']:
            return JsonResponse({
                "success": False,
                "detail": "Неподдерживаемый тип медиа"
            }, status=400)
        
        # Валидация файла
        file_content = file.read()
        validation_errors = MediaValidator.validate_image(file_content, file.name)
        
        if validation_errors:
            return JsonResponse({
                "success": False,
                "detail": "Ошибка валидации",
                "errors": validation_errors
            }, status=400)
        
        # Сохраняем медиа
        logger.error(f"About to call MediaStorage.save_media...")
        media = MediaStorage.save_media(user, media_type, file_content, file.name)
        logger.error(f"MediaStorage.save_media returned: {media}")
        
        # Делаем медиа активным (деактивируем старые)
        UserProfileMedia.objects.filter(
            user=user, 
            media_type=media_type, 
            is_active=True
        ).update(is_active=False)
        
        media.is_active = True
        media.save()
        
        # Получаем URL всех размеров
        sizes = {}
        for opt in media.optimized_versions.all():
            sizes[opt.size_type] = MediaStorage.get_media_url(media, opt.size_type)
        
        return JsonResponse({
            "success": True,
            "message": "Файл успешно загружен",
            "media": {
                "id": media.id,
                "media_type": media.media_type,
                "original_filename": media.original_filename,
                "file_size": media.file_size,
                "width": media.width,
                "height": media.height,
                "created_at": media.created_at.isoformat(),
                "sizes": sizes
            }
        })
        
    except Exception as e:
        return JsonResponse({
            "success": False,
            "detail": f"Ошибка загрузки: {str(e)}"
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def set_active_media(request):
    """Установка активного медиа (аватар/баннер)"""
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
        
        data = json.loads(request.body)
        media_id = data.get('media_id')
        
        if not media_id:
            return JsonResponse({
                "success": False,
                "detail": "ID медиа не указан"
            }, status=400)
        
        # Находим медиа
        media = UserProfileMedia.objects.filter(
            id=media_id,
            user=user
        ).first()
        
        if not media:
            return JsonResponse({
                "success": False,
                "detail": "Медиа не найден"
            }, status=404)
        
        # Деактивируем все медиа этого типа
        UserProfileMedia.objects.filter(
            user=user,
            media_type=media.media_type,
            is_active=True
        ).update(is_active=False)
        
        # Активируем выбранный медиа
        media.is_active = True
        media.save()
        
        return JsonResponse({
            "success": True,
            "message": "Активное медиа обновлено",
            "media": {
                "id": media.id,
                "media_type": media.media_type,
                "urls": {
                    "original": MediaStorage.get_media_url(media, 'large'),
                    "medium": MediaStorage.get_media_url(media, 'medium'),
                    "small": MediaStorage.get_media_url(media, 'small'),
                    "thumbnail": MediaStorage.get_media_url(media, 'thumbnail'),
                }
            }
        })
        
    except Exception as e:
        return JsonResponse({
            "success": False,
            "detail": f"Ошибка обновления: {str(e)}"
        }, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_user_media(request):
    """Получение всех медиа пользователя"""
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
        
        media_type = request.GET.get('type')  # avatar, banner или None (все)
        
        # Фильтруем медиа
        media_query = UserProfileMedia.objects.filter(user=user)
        if media_type:
            media_query = media_query.filter(media_type=media_type)
        
        media_list = []
        for media in media_query.order_by('-created_at'):
            sizes = {}
            for opt in media.optimized_versions.all():
                sizes[opt.size_type] = MediaStorage.get_media_url(media, opt.size_type)
            
            media_list.append({
                "id": media.id,
                "media_type": media.media_type,
                "original_filename": media.original_filename,
                "file_size": media.file_size,
                "width": media.width,
                "height": media.height,
                "is_active": media.is_active,
                "created_at": media.created_at.isoformat(),
                "urls": {
                    "original": MediaStorage.get_media_url(media, 'large'),
                    "medium": MediaStorage.get_media_url(media, 'medium'),
                    "small": MediaStorage.get_media_url(media, 'small'),
                    "thumbnail": MediaStorage.get_media_url(media, 'thumbnail'),
                }
            })
        
        return JsonResponse({
            "success": True,
            "media": media_list,
            "total": len(media_list)
        })
        
    except Exception as e:
        return JsonResponse({
            "success": False,
            "detail": f"Ошибка получения: {str(e)}"
        }, status=500)

@csrf_exempt
@require_http_methods(["DELETE"])
def delete_media(request, media_id):
    """Удаление медиа"""
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
        
        # Находим медиа
        media = UserProfileMedia.objects.filter(
            id=media_id,
            user=user
        ).first()
        
        if not media:
            return JsonResponse({
                "success": False,
                "detail": "Медиа не найден"
            }, status=404)
        
        # Нельзя удалять активный медиа
        if media.is_active:
            return JsonResponse({
                "success": False,
                "detail": "Нельзя удалить активный медиа файл"
            }, status=400)
        
        # Удаляем файлы
        from django.core.files.storage import default_storage
        
        if default_storage.exists(media.file_path):
            default_storage.delete(media.file_path)
        
        # Удаляем оптимизированные версии
        for opt in media.optimized_versions.all():
            if default_storage.exists(opt.file_path):
                default_storage.delete(opt.file_path)
            opt.delete()
        
        # Удаляем запись
        media.delete()
        
        return JsonResponse({
            "success": True,
            "message": "Медиа успешно удалено"
        })
        
    except Exception as e:
        return JsonResponse({
            "success": False,
            "detail": f"Ошибка удаления: {str(e)}"
        }, status=500)
