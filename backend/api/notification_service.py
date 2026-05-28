"""Helpers for persistent in-app user notifications."""

from __future__ import annotations

from django.utils import timezone

from .models import User, UserNotification


class NotificationService:
    @staticmethod
    def create(
        user: User,
        notification_type: str,
        title: str,
        body: str = "",
        metadata: dict | None = None,
    ) -> UserNotification:
        return UserNotification.objects.create(
            user=user,
            notification_type=notification_type,
            title=title,
            body=body,
            metadata=metadata or {},
        )

    @staticmethod
    def mark_all_read(user: User) -> int:
        updated = UserNotification.objects.filter(user=user, is_read=False).update(
            is_read=True,
            read_at=timezone.now(),
        )
        return updated
