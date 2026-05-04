from .models import Administration, User


def sync_administration_auth_flags(user: User | None) -> None:
    if user is None or not getattr(user, "pk", None):
        return

    has_admin_assignment = Administration.objects.filter(
        administrator=user,
        is_active=True,
    ).exists()

    updates = []
    elevated_by_sync = False

    if has_admin_assignment:
        if not user.is_staff:
            user.is_staff = True
            updates.append("is_staff")
            elevated_by_sync = True
        if not user.is_superuser:
            user.is_superuser = True
            updates.append("is_superuser")
            elevated_by_sync = True
        if elevated_by_sync and not user.auth_sync_managed:
            user.auth_sync_managed = True
            updates.append("auth_sync_managed")
    elif user.auth_sync_managed:
        if user.is_staff:
            user.is_staff = False
            updates.append("is_staff")
        if user.is_superuser:
            user.is_superuser = False
            updates.append("is_superuser")
        user.auth_sync_managed = False
        updates.append("auth_sync_managed")

    if updates:
        user.save(update_fields=updates)
