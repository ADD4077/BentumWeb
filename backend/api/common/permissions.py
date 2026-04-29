from __future__ import annotations

from typing import Optional

from ..models import Administration, User


def get_product_role(user: Optional[User]) -> Optional[str]:
    if user is None:
        return None
    return user.role


def is_system_administrator(user: Optional[User]) -> bool:
    if user is None or not getattr(user, "pk", None):
        return False
    return Administration.objects.filter(administrator=user, is_active=True).exists()


def can_access_admin_panel(user: Optional[User]) -> bool:
    return is_system_administrator(user)


def can_manage_users(user: Optional[User]) -> bool:
    return is_system_administrator(user)


def can_handle_reports(user: Optional[User]) -> bool:
    role = get_product_role(user)
    return role == User.ROLE_MODERATOR or is_system_administrator(user)


def can_manage_events(user: Optional[User]) -> bool:
    role = get_product_role(user)
    return role == User.ROLE_CHAIRPERSON or is_system_administrator(user)
