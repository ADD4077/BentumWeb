import logging
import re
from datetime import datetime, time as dt_time

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.core.paginator import Paginator
from django.db import connection
from django.db.models import BooleanField, Case, Count, Exists, OuterRef, Q, Subquery, Value, When
from django.http import JsonResponse
from django.utils import timezone
from rest_framework.decorators import api_view

from .activity_service import get_paginated_activity, get_recent_activity, log_activity_event
from .ban_service import BanService
from .common.decorators import allow_unverified_2fa, session_csrf_protect
from .common.permissions import can_access_admin_panel, is_system_administrator
from .common.utils import get_public_user_profile_data, get_user_full_data, serialize_datetime
from .media_service import MediaStorage
from .models import (
    ActivityEvent,
    Administration,
    SupportMessage,
    SupportThread,
    User,
    UserBan,
    UserProfileMedia,
)

logger = logging.getLogger(__name__)

VALID_USER_ROLES = {value for value, _label in User.ROLE_CHOICES}
FACULTY_FALLBACK = "Не указан"


def _serialize_admin_user(user_row, active_avatars):
    return {
        **user_row,
        "created_at": serialize_datetime(user_row.get("created_at")),
        "last_login": serialize_datetime(user_row.get("last_login")),
        "status": "banned" if user_row.get("is_banned_flag") else "active",
        "is_admin": bool(user_row.get("is_admin_flag")),
        "avatar_url": active_avatars.get(user_row["id"]),
    }


def _get_session_user(request):
    request_user = getattr(request, "user", None)
    if isinstance(request_user, User) and getattr(request_user, "is_authenticated", False):
        request.session["student_code"] = request_user.student_code
        request.session["fullname"] = request_user.fullname
        request.session["faculty"] = request_user.faculty
        request.session["is_authenticated"] = True
        return request_user, None
    if not request.session.get("is_authenticated"):
        return None, JsonResponse({"detail": "Требуется авторизация"}, status=401)

    student_code = request.session.get("student_code")
    user = User.objects.filter(student_code=student_code).first()
    if not user:
        return None, JsonResponse({"detail": "Пользователь не найден"}, status=404)

    return user, None


def _require_admin_user(request):
    user, error_response = _get_session_user(request)
    if error_response:
        return None, error_response

    if not can_access_admin_panel(user):
        return None, JsonResponse({"detail": "Доступ запрещен"}, status=403)

    return user, None


def _request_data(request):
    return request.data if isinstance(request.data, dict) else {}


def _parse_positive_int(value, default, minimum=1, maximum=None):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default

    if parsed < minimum:
        return default

    if maximum is not None:
        parsed = min(parsed, maximum)

    return parsed


def _matches_period(created_at, period):
    if not created_at or period == "all":
        return period == "all"

    days = {
        "today": 1,
        "week": 7,
        "month": 30,
        "quarter": 90,
    }.get(period)

    if not days:
        return True

    return timezone.now() - created_at <= timezone.timedelta(days=days)


def _build_registrations_series(user_created_at_values, days=30):
    now = timezone.localtime()
    buckets = []
    bucket_map = {}

    for offset in range(days):
        bucket_date = (now - timezone.timedelta(days=days - offset - 1)).date()
        bucket = {
            "key": bucket_date.isoformat(),
            "label": bucket_date.strftime("%d %b"),
            "count": 0,
        }
        buckets.append(bucket)
        bucket_map[bucket["key"]] = bucket

    for created_at in user_created_at_values:
        if not created_at:
            continue

        bucket = bucket_map.get(timezone.localtime(created_at).date().isoformat())
        if bucket:
            bucket["count"] += 1

    return [{"label": bucket["label"], "count": bucket["count"]} for bucket in buckets]


def _build_role_distribution(role_rows):
    role_counts = {}
    role_labels = {
        "student": "Студент",
        "teacher": "Преподаватель",
        "chairperson": "Председатель",
        "moderator": "Модератор",
        "admin": "Администратор",
    }
    role_colors = {
        "student": "#3b82f6",
        "teacher": "#10b981",
        "chairperson": "#f59e0b",
        "moderator": "#d946ef",
        "admin": "#8b5cf6",
    }

    total = 0
    for user_row in role_rows:
        count = int(user_row.get("count") or 0)
        role_key = "admin" if user_row.get("is_admin_flag") else (user_row.get("role") or "student")
        role_counts[role_key] = role_counts.get(role_key, 0) + count
        total += count

    distribution = []
    for role_key, count in sorted(role_counts.items(), key=lambda item: item[1], reverse=True):
        distribution.append(
            {
                "label": role_labels.get(role_key, role_key),
                "count": count,
                "color": role_colors.get(role_key, "#64748b"),
                "percentage": f"{((count / total) * 100):.1f}" if total else "0.0",
            }
        )

    return distribution


def _get_admin_users_queryset():
    active_ban_exists = UserBan.objects.filter(
        student_code=OuterRef("student_code"),
        is_active=True,
    )
    active_admin_exists = Administration.objects.filter(
        administrator_id=OuterRef("pk"),
        is_active=True,
    )

    return User.objects.annotate(
        is_banned_flag=Exists(active_ban_exists),
        is_admin_flag=Case(
            When(is_superuser=True, then=Value(True)),
            default=Exists(active_admin_exists),
            output_field=BooleanField(),
        ),
    )


def _apply_users_filters(queryset, *, search="", status_filter="all", role_filter="all", faculty_filter="all", period_filter="all"):
    if search:
        queryset = queryset.filter(
            Q(fullname__icontains=search) | Q(student_code__icontains=search)
        )

    if status_filter == "banned":
        queryset = queryset.filter(is_banned_flag=True)
    elif status_filter == "active":
        queryset = queryset.filter(is_banned_flag=False)

    if role_filter == "admin":
        queryset = queryset.filter(is_admin_flag=True)
    elif role_filter != "all":
        queryset = queryset.filter(is_admin_flag=False, role=role_filter)

    if faculty_filter != "all":
        if faculty_filter == FACULTY_FALLBACK:
            queryset = queryset.filter(Q(faculty__isnull=True) | Q(faculty=""))
        else:
            queryset = queryset.filter(faculty=faculty_filter)

    if period_filter != "all":
        days = {
            "today": 1,
            "week": 7,
            "month": 30,
            "quarter": 90,
        }.get(period_filter)
        if days:
            queryset = queryset.filter(created_at__gte=timezone.now() - timezone.timedelta(days=days))

    return queryset


def _apply_users_sort(queryset, sort_by):
    if sort_by == "oldest":
        return queryset.order_by("created_at", "id")
    if sort_by == "name":
        return queryset.order_by("fullname", "id")
    if sort_by == "activity":
        return queryset.order_by("-last_login", "-created_at", "-id")
    return queryset.order_by("-created_at", "-id")


def _build_system_status():
    database_ok = True
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception:
        database_ok = False

    media_root = getattr(settings, "MEDIA_ROOT", "")
    media_root_display = str(media_root) if media_root else ""
    media_ok = bool(media_root_display)

    telegram_ok = bool(
        getattr(settings, "TELEGRAM_BOT_TOKEN", None)
        and getattr(settings, "TELEGRAM_CHAT_ID", None)
    )

    return [
        {
            "label": "База данных",
            "description": "Проверка подключения к базе",
            "status": "Работает" if database_ok else "Ошибка",
            "iconKey": "database",
            "tone": "success" if database_ok else "danger",
        },
        {
            "label": "Медиа-хранилище",
            "description": media_root_display or "MEDIA_ROOT не настроен",
            "status": "Доступно" if media_ok else "Не настроено",
            "iconKey": "files",
            "tone": "success" if media_ok else "warning",
        },
        {
            "label": "Telegram интеграция",
            "description": "Бот и привязка Telegram",
            "status": "Активна" if telegram_ok else "Не настроена",
            "iconKey": "lock",
            "tone": "success" if telegram_ok else "warning",
        },
    ]


def _build_moderation_queue():
    preview_subquery = SupportMessage.objects.filter(
        thread_id=OuterRef("pk")
    ).order_by("created_at").values("body")[:1]
    moderator_reply_exists = SupportMessage.objects.filter(
        thread_id=OuterRef("pk"),
        is_moderator_reply=True,
    )

    threads = (
        SupportThread.objects.filter(status=SupportThread.STATUS_OPEN)
        .select_related("created_by")
        .annotate(
            has_moderator_reply=Exists(moderator_reply_exists),
            messages_count=Count("messages", distinct=True),
            preview=Subquery(preview_subquery),
        )
        .filter(has_moderator_reply=False)
        .order_by("-last_message_at")[:3]
    )

    return [
        {
            "id": thread.id,
            "subject": thread.subject,
            "request_type": thread.request_type,
            "preview": (thread.preview or "")[:120],
            "messages_count": thread.messages_count,
            "last_message_at": serialize_datetime(thread.last_message_at),
            "created_by": {
                "fullname": thread.created_by.fullname,
                "student_code": thread.created_by.student_code,
            },
        }
        for thread in threads
    ]


@api_view(["GET"])
def get_all_users(request):
    """Получить список всех пользователей."""
    try:
        _, error_response = _require_admin_user(request)
        if error_response:
            return error_response

        page = _parse_positive_int(request.GET.get("page"), 1)
        page_size = _parse_positive_int(request.GET.get("page_size"), 10, maximum=100)
        search = (request.GET.get("search") or "").strip()
        status_filter = (request.GET.get("status") or "all").strip().lower()
        role_filter = (request.GET.get("role") or "all").strip().lower()
        faculty_filter = (request.GET.get("faculty") or "all").strip()
        period_filter = (request.GET.get("period") or "all").strip().lower()
        sort_by = (request.GET.get("sort") or "newest").strip().lower()

        base_queryset = _get_admin_users_queryset()
        faculties = sorted(
            {
                (faculty or FACULTY_FALLBACK)
                for faculty in User.objects.order_by().values_list("faculty", flat=True).distinct()
            }
        )
        filtered_queryset = _apply_users_filters(
            base_queryset,
            search=search,
            status_filter=status_filter,
            role_filter=role_filter,
            faculty_filter=faculty_filter,
            period_filter=period_filter,
        )
        filtered_queryset = _apply_users_sort(filtered_queryset, sort_by)

        total = filtered_queryset.count()
        paginator = Paginator(range(total), page_size)
        page_obj = paginator.get_page(page)
        page_start = (page_obj.number - 1) * page_size
        page_end = page_start + page_size

        users_rows = list(
            filtered_queryset.values(
                "id",
                "fullname",
                "student_code",
                "faculty",
                "role",
                "created_at",
                "last_login",
                "is_banned_flag",
                "is_admin_flag",
            )[page_start:page_end]
        )

        active_avatars = {
            media.user_id: MediaStorage.get_media_url(media, "medium")
            for media in UserProfileMedia.objects.filter(
                user_id__in=[user["id"] for user in users_rows],
                media_type="avatar",
                is_active=True,
            ).select_related("user")
        }

        users_page = [_serialize_admin_user(user, active_avatars) for user in users_rows]
        recent_activity = [
            {
                **item,
                "created_at": item["created_at"].isoformat(),
            }
            for item in get_recent_activity(limit=3)
        ]
        role_distribution_rows = list(
            filtered_queryset.values("role", "is_admin_flag").annotate(count=Count("id"))
        )
        registrations_series = _build_registrations_series(
            filtered_queryset.values_list("created_at", flat=True)
        )

        return JsonResponse(
            {
                "success": True,
                "users": users_page,
                "total": total,
                "page": page_obj.number,
                "page_size": page_size,
                "total_pages": paginator.num_pages or 1,
                "faculties": faculties,
                "insights": {
                    "roleDistribution": _build_role_distribution(role_distribution_rows),
                    "registrationsSeries": registrations_series,
                    "recentActivity": recent_activity,
                    "moderationQueue": _build_moderation_queue(),
                },
            }
        )
    except Exception:
        logger.exception("Failed to fetch users list")
        return JsonResponse({"success": False, "detail": "Внутренняя ошибка сервера"}, status=500)


@api_view(["GET"])
def get_users_stats(request):
    """Получить статистику пользователей."""
    try:
        _, error_response = _require_admin_user(request)
        if error_response:
            return error_response

        total_users = User.objects.count()
        student_codes = list(User.objects.values_list("student_code", flat=True))
        ban_statuses = BanService.get_ban_statuses(student_codes)

        banned_count = sum(1 for status in ban_statuses.values() if status["is_banned"])
        active_count = total_users - banned_count

        today_start = timezone.make_aware(datetime.combine(timezone.localdate(), dt_time.min))
        week_start = timezone.now() - timezone.timedelta(days=7)
        new_users_today = User.objects.filter(created_at__gte=today_start).count()
        new_users_week = User.objects.filter(created_at__gte=week_start).count()

        return JsonResponse(
            {
                "success": True,
                "stats": {
                    "totalUsers": total_users,
                    "bannedUsers": banned_count,
                    "activeUsers": active_count,
                    "newUsersToday": new_users_today,
                    "newUsersWeek": new_users_week,
                },
            }
        )
    except Exception:
        logger.exception("Failed to fetch users stats")
        return JsonResponse({"success": False, "detail": "Внутренняя ошибка сервера"}, status=500)


@api_view(["GET"])
def get_admin_activity(request):
    """Получить журнал действий для админки."""
    try:
        _, error_response = _require_admin_user(request)
        if error_response:
            return error_response

        page = _parse_positive_int(request.GET.get("page"), 1)
        page_size = _parse_positive_int(request.GET.get("page_size"), 10, maximum=100)
        search = (request.GET.get("search") or "").strip()
        event_type = (request.GET.get("event_type") or "all").strip()
        period = (request.GET.get("period") or "all").strip().lower()

        payload = get_paginated_activity(
            page=page,
            page_size=page_size,
            search=search,
            event_type=event_type,
            period=period,
        )

        return JsonResponse({"success": True, **payload})
    except Exception:
        logger.exception("Failed to fetch admin activity")
        return JsonResponse({"success": False, "detail": "Внутренняя ошибка сервера"}, status=500)


@session_csrf_protect
@api_view(["POST"])
def create_user(request):
    """Создать нового пользователя."""
    try:
        _, error_response = _require_admin_user(request)
        if error_response:
            return error_response

        data = _request_data(request)
        if not data:
            return JsonResponse({"success": False, "detail": "Неверный формат данных"}, status=400)

        required_fields = ["fullname", "student_code", "faculty", "password"]
        for field in required_fields:
            if not data.get(field):
                return JsonResponse(
                    {"success": False, "detail": f"Поле {field} обязательно"},
                    status=400,
                )

        if not re.match(r"^\d{10}$", data["student_code"]):
            return JsonResponse(
                {"success": False, "detail": "Код студента должен состоять из 10 цифр"},
                status=400,
            )

        if len(data["password"]) < 7:
            return JsonResponse(
                {"success": False, "detail": "Пароль должен содержать минимум 7 символов"},
                status=400,
            )

        role = data.get("role") or User.ROLE_STUDENT
        if role not in VALID_USER_ROLES:
            return JsonResponse(
                {"success": False, "detail": "Некорректная роль пользователя"},
                status=400,
            )

        if User.objects.filter(student_code=data["student_code"]).exists():
            return JsonResponse(
                {
                    "success": False,
                    "detail": "Пользователь с таким кодом студента уже существует",
                },
                status=400,
            )

        User.objects.create(
            fullname=data["fullname"],
            student_code=data["student_code"],
            faculty=data["faculty"],
            role=role,
            password=make_password(data["password"]),
            created_at=timezone.now(),
        )

        return JsonResponse(
            {
                "success": True,
                "message": f'Пользователь {data["fullname"]} успешно создан',
            }
        )
    except Exception:
        logger.exception("Failed to create user")
        return JsonResponse({"success": False, "detail": "Внутренняя ошибка сервера"}, status=500)


@session_csrf_protect
@api_view(["POST"])
def ban_user(request):
    """Забанить пользователя."""
    try:
        current_user, error_response = _require_admin_user(request)
        if error_response:
            return error_response

        data = _request_data(request)
        if not data:
            return JsonResponse({"success": False, "detail": "Неверный формат данных"}, status=400)

        user_id = data.get("user_id")
        reason = data.get("reason", "Причина не указана")
        duration_days = data.get("duration", 7)
        duration_seconds = data.get("duration_seconds")

        if not user_id:
            return JsonResponse({"success": False, "detail": "ID пользователя обязателен"}, status=400)

        try:
            user_to_ban = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return JsonResponse({"success": False, "detail": "Пользователь не найден"}, status=404)

        if is_system_administrator(user_to_ban):
            return JsonResponse(
                {"success": False, "detail": "Нельзя заблокировать администратора"},
                status=403,
            )

        if duration_seconds is not None:
            try:
                duration_seconds = int(duration_seconds)
            except (TypeError, ValueError):
                return JsonResponse(
                    {"success": False, "detail": "Некорректная длительность блокировки"},
                    status=400,
                )
        else:
            try:
                duration_days = int(duration_days)
            except (TypeError, ValueError):
                return JsonResponse(
                    {"success": False, "detail": "Некорректная длительность блокировки"},
                    status=400,
                )
            duration_seconds = (
                BanService.FOREVER_DURATION_SECONDS
                if duration_days == -1
                else duration_days * 24 * 60 * 60
            )

        if duration_seconds == 0 or duration_seconds < BanService.FOREVER_DURATION_SECONDS:
            return JsonResponse(
                {"success": False, "detail": "Некорректная длительность блокировки"},
                status=400,
            )

        result = BanService.ban_user(
            student_code=user_to_ban.student_code,
            banned_by_id=current_user.id,
            duration_seconds=duration_seconds,
            reason=reason,
        )

        if result["success"]:
            return JsonResponse(
                {
                    "success": True,
                    "message": f"Пользователь {user_to_ban.fullname} заблокирован",
                    "ban_end_date": result.get("ban_end_date"),
                    "ban_duration_seconds": result.get("ban_duration_seconds"),
                    "ban_reason": result.get("ban_reason"),
                }
            )

        return JsonResponse({"success": False, "detail": result["detail"]}, status=400)
    except Exception:
        logger.exception("Failed to ban user")
        return JsonResponse({"success": False, "detail": "Внутренняя ошибка сервера"}, status=500)


@session_csrf_protect
@api_view(["POST"])
def unban_user(request):
    """Разбанить пользователя."""
    try:
        current_user, error_response = _require_admin_user(request)
        if error_response:
            return error_response

        data = _request_data(request)
        if not data:
            return JsonResponse({"success": False, "detail": "Неверный формат данных"}, status=400)

        user_id = data.get("user_id")
        if not user_id:
            return JsonResponse({"success": False, "detail": "ID пользователя обязателен"}, status=400)

        try:
            user_to_unban = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return JsonResponse({"success": False, "detail": "Пользователь не найден"}, status=404)

        result = BanService.unban_user(
            student_code=user_to_unban.student_code,
            unbanned_by_id=current_user.id,
        )

        if result["success"]:
            log_activity_event(
                ActivityEvent.EVENT_USER_UNBANNED,
                user=user_to_unban,
                actor=current_user,
                details="Пользователь разблокирован администратором",
            )
            return JsonResponse(
                {
                    "success": True,
                    "message": f"Пользователь {user_to_unban.fullname} разблокирован",
                }
            )

        return JsonResponse({"success": False, "detail": result["detail"]}, status=400)
    except Exception:
        logger.exception("Failed to unban user")
        return JsonResponse({"success": False, "detail": "Внутренняя ошибка сервера"}, status=500)


@api_view(["GET"])
@allow_unverified_2fa
def get_user_by_code(request, student_code):
    """Получить информацию о пользователе по студенческому коду."""
    try:
        viewer, error_response = _get_session_user(request)
        if error_response:
            request.session.modified = False
            return error_response

        user = User.objects.filter(student_code=student_code).first()

        if not user:
            request.session.modified = False
            return JsonResponse({"success": True, "user": None})

        user_data = get_public_user_profile_data(
            user,
            viewer=viewer,
            respect_privacy_strictly=True,
        )
        request.session.modified = False

        return JsonResponse({"success": True, "user": user_data})
    except Exception:
        request.session.modified = False
        logger.exception("Failed to fetch user by code")
        return JsonResponse({"success": False, "detail": "Внутренняя ошибка сервера"}, status=500)

@api_view(["GET"])
def get_admin_user_profile(request, user_id):
    """Получить полный профиль пользователя для админки."""
    try:
        _, error_response = _require_admin_user(request)
        if error_response:
            return error_response

        user = User.objects.filter(id=user_id).first()
        if not user:
            return JsonResponse({"success": False, "detail": "Пользователь не найден"}, status=404)

        return JsonResponse({"success": True, "user": get_user_full_data(user)})
    except Exception:
        logger.exception("Failed to fetch admin user profile")
        return JsonResponse({"success": False, "detail": "Внутренняя ошибка сервера"}, status=500)


@allow_unverified_2fa
@api_view(["GET"])
def get_public_stats(request):
    """Публичный endpoint для получения статистики."""
    if request.method != "GET":
        return JsonResponse({"detail": "Метод не разрешен"}, status=405)

    try:
        total_users = User.objects.count()
        unique_faculties = User.objects.values_list("faculty", flat=True).distinct()
        faculties_count = len([faculty for faculty in unique_faculties if faculty])

        student_codes = list(User.objects.values_list("student_code", flat=True))
        ban_statuses = BanService.get_ban_statuses(student_codes)
        banned_count = sum(1 for status in ban_statuses.values() if status["is_banned"])

        return JsonResponse(
            {
                "success": True,
                "stats": {
                    "totalUsers": total_users,
                    "facultiesCount": faculties_count,
                    "bannedUsers": banned_count,
                    "activeUsers": total_users - banned_count,
                    "uptime": "99.9%",
                },
            }
        )
    except Exception:
        logger.exception("Failed to fetch public stats")
        return JsonResponse(
            {"success": False, "detail": "Ошибка загрузки статистики"},
            status=500,
        )
