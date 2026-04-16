"""
Сервисы модуля ядра - Бизнес-логика для аутентификации и управления пользователями
"""
import logging
from typing import Optional, Tuple, Dict, Any
from django.core.cache import cache
from ..models import User, UserSession

logger = logging.getLogger(__name__)


class AuthService:
    """Сервис для бизнес-логики, связанной с аутентификацией"""
    
    @staticmethod
    def check_login_attempts(student_code: str) -> Tuple[bool, str]:
        """Проверить, превысил ли пользователь лимит попыток входа"""
        user_key = f"login_attempts_user:{student_code}"
        user_attempts = cache.get(user_key, 0)
        
        if user_attempts >= 5:
            return False, "Слишком много попыток входа. Попробуйте позже."
        
        cache.set(user_key, user_attempts + 1, 15)
        return True, ""
    
    @staticmethod
    def clear_login_attempts(student_code: str):
        """Очистить счётчики попыток входа после успешной аутентификации"""
        cache.delete(f"login_attempts_user:{student_code}")


class SessionService:
    """Сервис для управления сессиями"""
    
    @staticmethod
    def get_user_sessions(student_code: str) -> list:
        """Получить все активные сессии пользователя"""
        sessions = UserSession.objects.filter(
            student_code=student_code
        ).order_by('-last_activity')
        
        sessions_data = []
        for session in sessions:
            session_data = {
                'id': session.id,
                'session_key': session.session_key,
                'browser': session.browser or 'Неизвестный браузер',
                'os': session.os or 'Неизвестная ОС',
                'ip_address': session.ip_address or 'Неизвестный IP',
                'created_at': session.created_at.isoformat() if session.created_at else None,
                'last_activity': session.last_activity.isoformat() if session.last_activity else None,
            }
            sessions_data.append(session_data)
        
        return sessions_data


class UserService:
    """Сервис для управления пользователями"""
    
    @staticmethod
    def get_user_by_code(student_code: str) -> Optional[User]:
        """Получить пользователя по студенческому коду"""
        return User.objects.filter(student_code=student_code).first()
    
    @staticmethod
    def user_exists(student_code: str) -> bool:
        """Проверить, существует ли пользователь"""
        return User.objects.filter(student_code=student_code).exists()
