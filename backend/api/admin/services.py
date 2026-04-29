"""
Сервисы модуля администратора - Бизнес-логика для администрирования
"""
import logging
from typing import List, Dict, Any, Optional
from django.utils import timezone
from ..common.permissions import is_system_administrator
from ..models import User, Administration, AdministrationHistory

logger = logging.getLogger(__name__)


class AdminService:
    """Сервис для управления администраторами"""
    
    @staticmethod
    def is_admin(user: User) -> bool:
        """Проверить, является ли пользователь администратором"""
        return is_system_administrator(user)
    
    @staticmethod
    def appoint_administrator(user: User, appointed_by: User) -> tuple:
        """Назначить пользователя администратором"""
        if AdminService.is_admin(user):
            return False, "Пользователь уже является администратором"
        
        try:
            administration = Administration.objects.create(
                administrator=user,
                appointed_by=appointed_by,
                is_active=True
            )
            
            # Log action
            AdministrationHistory.objects.create(
                user=user,
                action='appoint_admin',
                performed_by=appointed_by,
                details=f"Назначен администратором пользователем {appointed_by.fullname}"
            )
            
            return True, administration
        except Exception as e:
            logger.error(f"Error appointing admin: {e}")
            return False, str(e)
    
    @staticmethod
    def remove_administrator(user: User, removed_by: User) -> tuple:
        """Отозвать права администратора"""
        if not AdminService.is_admin(user):
            return False, "Пользователь не является администратором"
        
        try:
            administration = Administration.objects.filter(
                administrator=user, 
                is_active=True
            ).first()
            
            if administration:
                administration.is_active = False
                administration.save()
                
                # Записать действие
                AdministrationHistory.objects.create(
                    user=user,
                    action='remove_admin',
                    performed_by=removed_by,
                    details=f"Снят с поста администратора пользователем {removed_by.fullname}"
                )
            
            return True, None
        except Exception as e:
            logger.error(f"Error removing admin: {e}")
            return False, str(e)
    
    @staticmethod
    def get_administrators_list() -> List[Dict[str, Any]]:
        """Получить список всех администраторов"""
        admins = Administration.objects.filter(is_active=True).select_related('administrator')
        
        result = []
        for admin in admins:
            result.append({
                'id': admin.id,
                'user_id': admin.administrator.id,
                'fullname': admin.administrator.fullname,
                'student_code': admin.administrator.student_code,
                'faculty': admin.administrator.faculty,
                'appointed_at': admin.appointed_at,
            })
        
        return result
    
    @staticmethod
    def get_administration_history(limit: int = 50) -> List[Dict[str, Any]]:
        """Получить историю администрирования"""
        history = AdministrationHistory.objects.all().order_by('-created_at')[:limit]
        
        result = []
        for record in history:
            result.append({
                'id': record.id,
                'user': record.user.fullname if record.user else None,
                'action': record.action,
                'performed_by': record.performed_by.fullname if record.performed_by else None,
                'details': record.details,
                'created_at': record.created_at,
            })
        
        return result
