"""
Сервисы модуля профиля - Бизнес-логика для управления профилем
"""
import logging
from typing import Optional, Dict, Any
from ..models import User
from ..common.utils import get_user_media

logger = logging.getLogger(__name__)


class ProfileService:
    """Сервис для управления профилем"""
    
    @staticmethod
    def get_profile_data(user: User) -> Dict[str, Any]:
        """Получить полные данные профиля пользователя"""
        media = get_user_media(user)
        
        return {
            'id': user.id,
            'fullname': user.fullname,
            'student_code': user.student_code,
            'faculty': user.faculty,
            'bilet_code': user.bilet_code,
            'created_at': user.created_at,
            'last_login': user.last_login,
            **media
        }
    
    @staticmethod
    def update_password(user: User, current_password: str, new_password: str) -> tuple:
        """Обновить пароль пользователя"""
        if not current_password or not new_password:
            return False, "Все поля обязательны для заполнения"
        
        if len(new_password) < 7:
            return False, "Пароль должен содержать минимум 7 символов"
        
        if user.bilet_code != current_password:
            return False, "Текущий пароль указан неверно"
        
        try:
            user.bilet_code = new_password
            user.save()
            return True, "Пароль успешно изменен"
        except Exception as e:
            logger.error(f"Error updating password: {e}")
            return False, str(e)
