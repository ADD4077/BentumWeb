"""
Сервисы модуля профиля.
"""

import logging
from typing import Any, Dict

from django.contrib.auth.hashers import check_password, make_password

from ..common.utils import get_user_media, serialize_datetime
from ..models import User

logger = logging.getLogger(__name__)


class ProfileService:
    """Сервис для управления профилем."""

    @staticmethod
    def get_profile_data(user: User) -> Dict[str, Any]:
        media = get_user_media(user)
        return {
            'id': user.id,
            'fullname': user.fullname,
            'student_code': user.student_code,
            'faculty': user.faculty,
            'created_at': serialize_datetime(user.created_at),
            'last_login': serialize_datetime(user.last_login),
            **media,
        }

    @staticmethod
    def update_password(user: User, current_password: str, new_password: str) -> tuple:
        if not current_password or not new_password:
            return False, "Все поля обязательны для заполнения"

        if len(new_password) < 7:
            return False, "Пароль должен содержать минимум 7 символов"

        if not check_password(current_password, user.password):
            return False, "Текущий пароль указан неверно"

        try:
            user.password = make_password(new_password)
            user.save(update_fields=['password'])
            return True, "Пароль успешно изменен"
        except Exception as exc:
            logger.error("Error updating password: %s", exc)
            return False, str(exc)
