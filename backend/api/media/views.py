import json
import logging
from datetime import datetime

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from ..media_service import MediaStorage, MediaValidator
from ..models import User, UserProfileMedia
from ..placeholder_service import PlaceholderGenerator

logger = logging.getLogger(__name__)


def _get_authenticated_user(request):
    if not request.session.get("is_authenticated"):
        return None, JsonResponse(
            {"success": False, "detail": "Требуется авторизация"},
            status=401,
        )

    student_code = request.session.get("student_code")
    user = User.objects.filter(student_code=student_code).first()
    if not user:
        return None, JsonResponse(
            {"success": False, "detail": "Пользователь не найден"},
            status=404,
        )

    return user, None


def _serialize_media_urls(media):
    return {
        "original": MediaStorage.get_media_url(media, "large"),
        "medium": MediaStorage.get_media_url(media, "medium"),
        "small": MediaStorage.get_media_url(media, "small"),
        "thumbnail": MediaStorage.get_media_url(media, "thumbnail"),
    }


def _serialize_created_at(value):
    if value is None:
        return datetime.now().isoformat()
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return datetime.fromtimestamp(value).isoformat()


@require_http_methods(["POST"])
def upload_media(request):
    """Upload avatar or banner image for the authenticated user."""
    try:
        user, error_response = _get_authenticated_user(request)
        if error_response:
            return error_response

        file = request.FILES.get("file") or request.FILES.get("image")
        if not file and request.FILES:
            file = next(iter(request.FILES.values()))

        if not file:
            return JsonResponse(
                {"success": False, "detail": "Файл не загружен"},
                status=400,
            )

        media_type = (
            request.POST.get("media_type")
            or request.POST.get("mediaType")
            or request.POST.get("type")
            or "avatar"
        )
        if media_type not in {"avatar", "banner"}:
            return JsonResponse(
                {"success": False, "detail": "Неподдерживаемый тип медиа"},
                status=400,
            )

        file_content = file.read()
        validation_errors = MediaValidator.validate_image(file_content, file.name)
        if validation_errors:
            return JsonResponse(
                {
                    "success": False,
                    "detail": validation_errors[0],
                    "errors": validation_errors,
                },
                status=400,
            )

        media = MediaStorage.save_media(user, media_type, file_content, file.name)

        UserProfileMedia.objects.filter(
            user=user,
            media_type=media_type,
            is_active=True,
        ).update(is_active=False)

        media.is_active = True
        media.save(update_fields=["is_active"])

        try:
            MediaStorage.cleanup_old_media(user, media_type)
        except Exception:
            logger.exception("Failed to cleanup old media for %s", user.student_code)

        sizes = {}
        for optimized in media.optimized_versions.all():
            sizes[optimized.size_type] = MediaStorage.get_media_url(media, optimized.size_type)

        return JsonResponse(
            {
                "success": True,
                "message": "Файл успешно загружен",
                "media": {
                    "id": media.id,
                    "media_type": media.media_type,
                    "original_filename": media.original_filename,
                    "file_size": media.file_size,
                    "width": media.width,
                    "height": media.height,
                    "created_at": _serialize_created_at(media.created_at),
                    "sizes": sizes,
                    "url": sizes.get("medium") or sizes.get("large") or sizes.get("thumbnail"),
                },
            }
        )
    except Exception:
        logger.exception("Unhandled media upload error")
        return JsonResponse(
            {"success": False, "detail": "Не удалось загрузить файл"},
            status=500,
        )


@require_http_methods(["POST"])
def set_active_media(request):
    """Set an existing media file as active."""
    try:
        user, error_response = _get_authenticated_user(request)
        if error_response:
            return error_response

        data = json.loads(request.body or "{}")
        media_id = data.get("media_id")
        if not media_id:
            return JsonResponse(
                {"success": False, "detail": "ID медиа не указан"},
                status=400,
            )

        media = UserProfileMedia.objects.filter(id=media_id, user=user).first()
        if not media:
            return JsonResponse(
                {"success": False, "detail": "Медиа не найдено"},
                status=404,
            )

        UserProfileMedia.objects.filter(
            user=user,
            media_type=media.media_type,
            is_active=True,
        ).update(is_active=False)

        media.is_active = True
        media.save(update_fields=["is_active"])

        try:
            MediaStorage.cleanup_old_media(user, media.media_type)
        except Exception:
            logger.exception("Failed to cleanup old media during activation for %s", user.student_code)

        return JsonResponse(
            {
                "success": True,
                "message": "Активное медиа обновлено",
                "media": {
                    "id": media.id,
                    "media_type": media.media_type,
                    "urls": _serialize_media_urls(media),
                },
            }
        )
    except json.JSONDecodeError:
        return JsonResponse(
            {"success": False, "detail": "Неверный формат JSON"},
            status=400,
        )
    except Exception:
        logger.exception("Unhandled media activation error")
        return JsonResponse(
            {"success": False, "detail": "Не удалось обновить медиа"},
            status=500,
        )


@require_http_methods(["GET"])
def get_user_media(request):
    """Return media files for the authenticated user."""
    try:
        user, error_response = _get_authenticated_user(request)
        if error_response:
            return error_response

        media_type = request.GET.get("type")
        media_query = UserProfileMedia.objects.filter(user=user)
        if media_type:
            media_query = media_query.filter(media_type=media_type)

        media_list = []
        found_avatar = False
        found_banner = False

        for media in media_query.order_by("-created_at"):
            if media.media_type == "avatar":
                found_avatar = True
            elif media.media_type == "banner":
                found_banner = True

            media_list.append(
                {
                    "id": media.id,
                    "media_type": media.media_type,
                    "original_filename": media.original_filename,
                    "file_size": media.file_size,
                    "width": media.width,
                    "height": media.height,
                    "is_active": media.is_active,
                    "created_at": _serialize_created_at(media.created_at),
                    "urls": _serialize_media_urls(media),
                }
            )

        if not media_type or media_type == "avatar":
            if not found_avatar:
                placeholder = PlaceholderGenerator.get_or_create_placeholder(user, "avatar")
                if placeholder:
                    media_list.append(
                        {
                            "id": placeholder.id,
                            "media_type": "avatar",
                            "original_filename": "placeholder_avatar.webp",
                            "file_size": 0,
                            "width": 400,
                            "height": 400,
                            "is_active": True,
                            "is_placeholder": True,
                            "created_at": placeholder.created_at.isoformat(),
                            "urls": _serialize_media_urls(placeholder),
                        }
                    )

        if not media_type or media_type == "banner":
            if not found_banner:
                placeholder = PlaceholderGenerator.get_or_create_placeholder(user, "banner")
                if placeholder:
                    media_list.append(
                        {
                            "id": placeholder.id,
                            "media_type": "banner",
                            "original_filename": "placeholder_banner.webp",
                            "file_size": 0,
                            "width": 1200,
                            "height": 400,
                            "is_active": True,
                            "is_placeholder": True,
                            "created_at": placeholder.created_at.isoformat(),
                            "urls": _serialize_media_urls(placeholder),
                        }
                    )

        return JsonResponse({"success": True, "media": media_list, "total": len(media_list)})
    except Exception:
        logger.exception("Unhandled media list error")
        return JsonResponse(
            {"success": False, "detail": "Не удалось получить список медиа"},
            status=500,
        )


@require_http_methods(["DELETE"])
def delete_media(request, media_id):
    """Delete an inactive media file by id."""
    try:
        user, error_response = _get_authenticated_user(request)
        if error_response:
            return error_response

        media = UserProfileMedia.objects.filter(id=media_id, user=user).first()
        if not media:
            return JsonResponse(
                {"success": False, "detail": "Медиа не найдено"},
                status=404,
            )

        if media.is_active:
            return JsonResponse(
                {"success": False, "detail": "Нельзя удалить активный медиафайл"},
                status=400,
            )

        MediaStorage.delete_media_files(media)
        return JsonResponse({"success": True, "message": "Медиа успешно удалено"})
    except Exception:
        logger.exception("Unhandled delete_media error")
        return JsonResponse(
            {"success": False, "detail": "Внутренняя ошибка сервера"},
            status=500,
        )


@require_http_methods(["GET"])
def get_user_media_by_id(request):
    """Return media data for a specific user."""
    try:
        user_id = request.GET.get("user_id")
        if not user_id:
            return JsonResponse(
                {"success": False, "detail": "Параметр user_id обязателен"},
                status=400,
            )

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return JsonResponse(
                {"success": False, "detail": "Пользователь не найден"},
                status=404,
            )

        avatar_media = UserProfileMedia.objects.filter(
            user=user,
            media_type="avatar",
            is_active=True,
        ).first()
        banner_media = UserProfileMedia.objects.filter(
            user=user,
            media_type="banner",
            is_active=True,
        ).first()

        avatar_url = MediaStorage.get_media_url(avatar_media, "medium") if avatar_media else None
        banner_url = MediaStorage.get_media_url(banner_media, "large") if banner_media else None

        avatar_placeholder = None
        banner_placeholder = None
        if not avatar_media:
            avatar_placeholder = PlaceholderGenerator.get_avatar_placeholder_data(user.fullname)
        if not banner_media:
            banner_placeholder = PlaceholderGenerator.get_banner_placeholder_data()

        return JsonResponse(
            {
                "success": True,
                "avatar_url": avatar_url,
                "banner_url": banner_url,
                "avatar_placeholder": avatar_placeholder,
                "banner_placeholder": banner_placeholder,
            }
        )
    except Exception:
        logger.exception("Unhandled get_user_media_by_id error")
        return JsonResponse(
            {"success": False, "detail": "Внутренняя ошибка сервера"},
            status=500,
        )


@require_http_methods(["POST"])
def delete_media_by_type(request):
    """Delete currently active media by type for the authenticated user."""
    try:
        user, error_response = _get_authenticated_user(request)
        if error_response:
            return error_response

        data = json.loads(request.body or "{}")
        media_type = data.get("media_type")
        if media_type not in {"avatar", "banner"}:
            return JsonResponse(
                {"success": False, "detail": "Неверный тип медиа"},
                status=400,
            )

        media = UserProfileMedia.objects.filter(
            user=user,
            media_type=media_type,
            is_active=True,
        ).first()
        if not media:
            return JsonResponse(
                {"success": False, "detail": "Медиа не найдено"},
                status=404,
            )

        MediaStorage.delete_media_files(media)
        return JsonResponse(
            {
                "success": True,
                "message": f"{media_type.capitalize()} успешно удален",
            }
        )
    except json.JSONDecodeError:
        return JsonResponse(
            {"success": False, "detail": "Неверный формат JSON"},
            status=400,
        )
    except Exception:
        logger.exception("Unhandled delete_media_by_type error")
        return JsonResponse(
            {"success": False, "detail": "Внутренняя ошибка сервера"},
            status=500,
        )
