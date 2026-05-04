from django.core.paginator import Paginator
from django.db.models import Count, Exists, OuterRef, Q, Subquery
from django.utils import timezone

from .models import ActivityEvent, Administration, TelegramBinding, User, UserBan

EVENT_META = {
    "user_created": {"title": "Новый пользователь", "category": "users"},
    "user_banned": {"title": "Пользователь заблокирован", "category": "security"},
    "user_unbanned": {"title": "Пользователь разблокирован", "category": "security"},
    "admin_assigned": {"title": "Назначен администратор", "category": "roles"},
    "admin_removed": {"title": "Снят администратор", "category": "roles"},
    "telegram_linked": {"title": "Привязан Telegram", "category": "integrations"},
    "telegram_unlinked": {"title": "Отвязан Telegram", "category": "integrations"},
    "twofa_enabled": {"title": "Включена 2FA", "category": "security"},
    "twofa_disabled": {"title": "Выключена 2FA", "category": "security"},
}

SOURCE_EVENT_TYPES = {
    "user_created": "users",
    "user_banned": "bans",
    "admin_assigned": "administration",
    "telegram_linked": "telegram",
    "telegram_unlinked": "telegram",
}


def log_activity_event(event_type, user=None, actor=None, details="", metadata=None):
    return ActivityEvent.objects.create(
        event_type=event_type,
        user=user,
        actor=actor,
        details=details or "",
        metadata=metadata or {},
    )


def _period_start(period):
    days = {
        "today": 1,
        "week": 7,
        "month": 30,
        "quarter": 90,
    }.get(period)
    if not days:
        return None
    return timezone.now() - timezone.timedelta(days=days)


def _serialize_feed_item(event_type, created_at, subject_name, subject_code="", details="", actor_name=""):
    meta = EVENT_META.get(event_type, {"title": event_type, "category": "other"})
    fallback_subject = "Пользователь"
    return {
        "id": f"{event_type}:{subject_code}:{created_at.isoformat()}",
        "event_type": event_type,
        "title": meta["title"],
        "category": meta["category"],
        "subtitle": subject_name or fallback_subject,
        "subject_name": subject_name or fallback_subject,
        "subject_code": subject_code or "",
        "details": details or "",
        "actor_name": actor_name or "",
        "created_at": created_at,
    }


def _matching_user_ids(search_value):
    if not search_value:
        return set()

    return set(
        User.objects.filter(
            Q(fullname__icontains=search_value) | Q(student_code__icontains=search_value)
        ).values_list("id", flat=True)
    )


def _matching_actor_ids(search_value):
    if not search_value:
        return set()

    return set(
        User.objects.filter(fullname__icontains=search_value).values_list("id", flat=True)
    )


def _collect_recent_users(limit, search_value="", period="all"):
    queryset = User.objects.exclude(created_at__isnull=True)
    period_start = _period_start(period)
    if period_start:
        queryset = queryset.filter(created_at__gte=period_start)
    if search_value:
        queryset = queryset.filter(
            Q(fullname__icontains=search_value) | Q(student_code__icontains=search_value)
        )

    total = queryset.count()
    rows = list(
        queryset.only("fullname", "student_code", "created_at").order_by("-created_at")[:limit]
    )
    items = [
        _serialize_feed_item(
            "user_created",
            user.created_at,
            user.fullname,
            user.student_code,
            details=f"Код: {user.student_code}",
        )
        for user in rows
    ]
    return total, items


def _collect_recent_bans(limit, search_value="", period="all"):
    queryset = UserBan.objects.all()
    period_start = _period_start(period)
    if period_start:
        queryset = queryset.filter(ban_date__gte=period_start)
    if search_value:
        matching_user_ids = _matching_user_ids(search_value)
        matching_actor_ids = _matching_actor_ids(search_value)
        queryset = queryset.filter(
            Q(student_code__icontains=search_value)
            | Q(ban_reason__icontains=search_value)
            | Q(user_id__in=matching_user_ids)
            | Q(banned_by_id__in=matching_actor_ids)
        )

    total = queryset.count()
    rows = list(
        queryset.select_related("user", "banned_by")
        .only(
            "student_code",
            "ban_date",
            "ban_reason",
            "user__fullname",
            "user__student_code",
            "banned_by__fullname",
        )
        .order_by("-ban_date")[:limit]
    )
    items = [
        _serialize_feed_item(
            "user_banned",
            ban.ban_date,
            ban.user.fullname if ban.user else ban.student_code,
            ban.user.student_code if ban.user else ban.student_code,
            details=ban.ban_reason,
            actor_name=ban.banned_by.fullname if ban.banned_by else "",
        )
        for ban in rows
    ]
    return total, items


def _collect_recent_admin_assignments(limit, search_value="", period="all"):
    queryset = Administration.objects.select_related("administrator", "appointed_by")
    period_start = _period_start(period)
    if period_start:
        queryset = queryset.filter(appointed_at__gte=period_start)
    if search_value:
        queryset = queryset.filter(
            Q(administrator__fullname__icontains=search_value)
            | Q(administrator__student_code__icontains=search_value)
            | Q(appointed_by__fullname__icontains=search_value)
        )

    total = queryset.count()
    rows = list(
        queryset.only(
            "administrator__fullname",
            "administrator__student_code",
            "appointed_by__fullname",
            "appointed_at",
        ).order_by("-appointed_at")[:limit]
    )
    items = [
        _serialize_feed_item(
            "admin_assigned",
            record.appointed_at,
            record.administrator.fullname,
            record.administrator.student_code,
            details="Пользователь получил права администратора",
            actor_name=record.appointed_by.fullname if record.appointed_by else "",
        )
        for record in rows
    ]
    return total, items


def _collect_recent_telegram_events(limit, search_value="", period="all", event_type="all"):
    queryset = TelegramBinding.objects.filter(telegram_id__gt=0).select_related("user")
    period_start = _period_start(period)
    if period_start:
        queryset = queryset.filter(updated_at__gte=period_start)
    if event_type == "telegram_linked":
        queryset = queryset.filter(is_active=True)
    elif event_type == "telegram_unlinked":
        queryset = queryset.filter(is_active=False)
    if search_value:
        queryset = queryset.filter(
            Q(user__fullname__icontains=search_value)
            | Q(user__student_code__icontains=search_value)
            | Q(telegram_username__icontains=search_value)
        )

    total = queryset.count()
    rows = list(
        queryset.only(
            "user__fullname",
            "user__student_code",
            "telegram_username",
            "is_active",
            "updated_at",
        ).order_by("-updated_at")[:limit]
    )
    items = [
        _serialize_feed_item(
            "telegram_linked" if binding.is_active else "telegram_unlinked",
            binding.updated_at,
            binding.user.fullname,
            binding.user.student_code,
            details=(
                f"@{binding.telegram_username}"
                if binding.telegram_username
                else "Telegram-аккаунт обновлен"
            ),
        )
        for binding in rows
    ]
    return total, items


def _collect_recent_activity_events(limit, search_value="", period="all", event_type="all"):
    queryset = ActivityEvent.objects.select_related("user", "actor")
    period_start = _period_start(period)
    if period_start:
        queryset = queryset.filter(created_at__gte=period_start)
    if event_type != "all":
        queryset = queryset.filter(event_type=event_type)
    if search_value:
        queryset = queryset.filter(
            Q(details__icontains=search_value)
            | Q(user__fullname__icontains=search_value)
            | Q(user__student_code__icontains=search_value)
            | Q(actor__fullname__icontains=search_value)
        )

    total = queryset.count()
    rows = list(
        queryset.only(
            "event_type",
            "details",
            "metadata",
            "created_at",
            "user__fullname",
            "user__student_code",
            "actor__fullname",
        ).order_by("-created_at")[:limit]
    )
    items = [
        _serialize_feed_item(
            event.event_type,
            event.created_at,
            event.user.fullname if event.user else event.metadata.get("subject_name", "Пользователь"),
            event.user.student_code if event.user else event.metadata.get("subject_code", ""),
            details=event.details or event.metadata.get("details", ""),
            actor_name=event.actor.fullname if event.actor else event.metadata.get("actor_name", ""),
        )
        for event in rows
    ]
    return total, items


def _collect_source_payloads(limit, search="", event_type="all", period="all"):
    search_value = (search or "").strip()
    sources = []

    if event_type in {"all", "user_created"}:
        sources.append(_collect_recent_users(limit, search_value=search_value, period=period))
    if event_type in {"all", "user_banned"}:
        sources.append(_collect_recent_bans(limit, search_value=search_value, period=period))
    if event_type in {"all", "admin_assigned"}:
        sources.append(
            _collect_recent_admin_assignments(limit, search_value=search_value, period=period)
        )
    if event_type in {"all", "telegram_linked", "telegram_unlinked"}:
        sources.append(
            _collect_recent_telegram_events(
                limit,
                search_value=search_value,
                period=period,
                event_type=event_type,
            )
        )
    if event_type == "all" or event_type not in SOURCE_EVENT_TYPES:
        sources.append(
            _collect_recent_activity_events(
                limit,
                search_value=search_value,
                period=period,
                event_type=event_type,
            )
        )

    return sources


def get_recent_activity(limit=3):
    source_limit = max(limit * 3, 10)
    sources = _collect_source_payloads(source_limit)
    items = []
    for _count, source_items in sources:
        items.extend(source_items)
    items.sort(key=lambda item: item["created_at"], reverse=True)
    return items[:limit]


def get_paginated_activity(page=1, page_size=10, search="", event_type="all", period="all"):
    source_limit = max(page * page_size * 3, 30)
    sources = _collect_source_payloads(
        source_limit,
        search=search,
        event_type=event_type,
        period=period,
    )

    total = sum(count for count, _items in sources)
    items = []
    for _count, source_items in sources:
        items.extend(source_items)

    items.sort(key=lambda item: item["created_at"], reverse=True)
    paginator = Paginator(items, page_size)
    page_obj = paginator.get_page(page)
    total_pages = max(1, (total + page_size - 1) // page_size) if page_size else 1
    serialized = [
        {
            **item,
            "created_at": item["created_at"].isoformat(),
        }
        for item in page_obj.object_list
    ]

    return {
        "items": serialized,
        "total": total,
        "page": page_obj.number,
        "total_pages": total_pages,
        "event_types": [
            {"value": key, "label": value["title"]}
            for key, value in EVENT_META.items()
        ],
    }
