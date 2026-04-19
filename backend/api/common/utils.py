"""
Вспомогательные функции для API-представлений.
"""

import os
import re
import sqlite3
from functools import wraps
from typing import Any, Dict, Optional, Tuple

from django.conf import settings
from django.http import JsonResponse

from ..ban_service import BanService
from ..media_service import MediaStorage
from ..models import Administration, User, UserProfileMedia


def require_auth(view_func):
    """Декоратор для проверки авторизации пользователя."""

    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.session.get("is_authenticated"):
            return JsonResponse(
                {
                    "success": False,
                    "detail": "Требуется авторизация",
                },
                status=401,
            )
        return view_func(request, *args, **kwargs)

    return wrapper


def require_admin(view_func):
    """Декоратор для проверки прав администратора."""

    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.session.get("is_authenticated"):
            return JsonResponse(
                {
                    "success": False,
                    "detail": "Требуется авторизация",
                },
                status=401,
            )

        student_code = request.session.get("student_code")
        if not student_code:
            return JsonResponse(
                {
                    "success": False,
                    "detail": "Отсутствует код студента",
                },
                status=401,
            )

        try:
            user = User.objects.get(student_code=student_code)
        except User.DoesNotExist:
            return JsonResponse(
                {
                    "success": False,
                    "detail": "Пользователь не найден",
                },
                status=404,
            )

        if not Administration.objects.filter(administrator=user, is_active=True).exists():
            return JsonResponse(
                {
                    "success": False,
                    "detail": "Недостаточно прав",
                },
                status=403,
            )

        return view_func(request, *args, **kwargs)

    return wrapper


def validate_method(allowed_methods):
    """Декоратор для валидации HTTP-метода."""

    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if request.method not in allowed_methods:
                return JsonResponse({"detail": "Метод не разрешен"}, status=405)
            return view_func(request, *args, **kwargs)

        return wrapper

    return decorator


def get_current_user(request) -> Optional[User]:
    """Получить текущего авторизованного пользователя из сессии."""
    student_code = request.session.get("student_code")
    if not student_code:
        return None
    return User.objects.filter(student_code=student_code).first()


def get_user_media(user: User) -> Dict[str, Any]:
    """Получить URL аватара и баннера или плейсхолдеры."""
    avatar_url = None
    banner_url = None
    avatar_placeholder = None
    banner_placeholder = None

    active_avatar = (
        UserProfileMedia.objects.filter(user=user, media_type="avatar", is_active=True)
        .select_related("user")
        .first()
    )
    if active_avatar:
        avatar_url = MediaStorage.get_media_url(active_avatar, "medium")
    else:
        avatar_placeholder = MediaStorage.get_placeholder_data(user, "avatar")

    active_banner = (
        UserProfileMedia.objects.filter(user=user, media_type="banner", is_active=True)
        .select_related("user")
        .first()
    )
    if active_banner:
        banner_url = MediaStorage.get_media_url(active_banner, "medium")
    else:
        banner_placeholder = MediaStorage.get_placeholder_data(user, "banner")

    return {
        "avatar_url": avatar_url,
        "banner_url": banner_url,
        "avatar_placeholder": avatar_placeholder,
        "banner_placeholder": banner_placeholder,
    }


def get_user_ban_status(student_code: str) -> Dict[str, Any]:
    """Получить статус бана пользователя."""
    return BanService.check_ban_status(student_code)


def get_user_admin_status(user: User) -> bool:
    """Проверить, является ли пользователь администратором."""
    return Administration.objects.filter(administrator=user, is_active=True).exists()


def get_user_full_data(user: User) -> Dict[str, Any]:
    """Получить полные данные пользователя, включая медиа и статус."""
    media = get_user_media(user)
    ban_status = get_user_ban_status(user.student_code)
    is_admin = get_user_admin_status(user)

    return {
        "id": user.id,
        "fullname": user.fullname,
        "student_code": user.student_code,
        "faculty": user.faculty,
        "created_at": user.created_at,
        "last_login": user.last_login,
        "is_banned": ban_status["is_banned"],
        "ban_info": ban_status.get("ban_info"),
        "is_admin": is_admin,
        **media,
    }


def parse_pagination(request) -> Tuple[int, int]:
    """Разобрать параметры пагинации из запроса."""
    try:
        page = int(request.GET.get("page", 1))
        page_size = int(request.GET.get("page_size", 6))
        if page < 1:
            page = 1
        if page_size < 1:
            page_size = 6
        if page_size > 100:
            page_size = 100
        return page, page_size
    except ValueError:
        return 1, 6


class SQLiteConnection:
    """Контекстный менеджер для SQLite-соединений."""

    def __init__(self, db_path: str):
        self.db_path = db_path
        self.conn = None
        self.cursor = None

    def __enter__(self):
        self.conn = sqlite3.connect(self.db_path)
        self.cursor = self.conn.cursor()
        return self.cursor

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()


def get_sqlite_connection(db_name: str) -> Optional[SQLiteConnection]:
    """Получить SQLite-соединение с контекстным менеджером."""
    db_path = os.path.join(settings.BASE_DIR, db_name)
    if not os.path.exists(db_path):
        return None
    return SQLiteConnection(db_path)


def format_size(size: Any) -> Optional[str]:
    """Нормализовать строку размера."""
    if not size and size != 0:
        return None

    if isinstance(size, (int, float)):
        try:
            return f"{float(size):.2f}"
        except Exception:
            return str(size)

    raw_size = str(size).strip()
    raw_size = re.sub(r"([0-9]+)\.([kKmMgGtT]?)\s*([bB])", r"\1\2\3", raw_size)
    match = re.match(r"^\s*([0-9]+(?:[.,][0-9]+)?)\s*([kKmMgGtT]?\s*[bB])?\s*$", raw_size)
    if not match:
        return raw_size

    num = match.group(1).replace(",", ".")
    unit = (match.group(2) or "").replace(" ", "")
    unit = unit.upper() if unit else ""

    if unit in ("B", ""):
        unit = "B" if unit == "B" else ""
    elif unit in ("KB", "K B"):
        unit = "KB"
    elif unit in ("MB", "M B"):
        unit = "MB"
    elif unit in ("GB", "G B"):
        unit = "GB"

    try:
        value = float(num)
        formatted = f"{value:.2f}"
        return f"{formatted}{unit}"
    except Exception:
        return raw_size


def parse_size(size_str: str) -> int:
    """Разобрать строку размера в байты."""
    if not size_str:
        return 0

    raw_size = str(size_str).strip()
    match = re.match(r"^\s*([0-9]+(?:[.,][0-9]*)?)\s*([kKmMgGtT]?\s*[bB])?\s*$", raw_size)
    if not match:
        return 0

    try:
        num = float(match.group(1).replace(",", "."))
        unit = (match.group(2) or "").replace(" ", "").upper()

        multipliers = {
            "B": 1,
            "KB": 1024,
            "MB": 1024 * 1024,
            "GB": 1024 * 1024 * 1024,
            "TB": 1024 * 1024 * 1024 * 1024,
        }

        multiplier = multipliers.get(unit, 1)
        return int(num * multiplier)
    except Exception:
        return 0


def parse_tags(tags: str) -> list:
    """Разобрать строку тегов в список."""
    if not tags:
        return []

    tag_list = re.split(r"[,;]\s*", tags.strip())
    parsed_tags = []
    for tag in tag_list:
        clean_tag = tag.strip()
        clean_tag = re.sub(r"^#+", "", clean_tag)
        clean_tag = clean_tag.strip()
        if clean_tag:
            parsed_tags.append(clean_tag)

    return parsed_tags
