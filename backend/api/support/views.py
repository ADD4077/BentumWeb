import json
import logging

from django.conf import settings
from django.core.paginator import Paginator
from django.db import transaction
from django.db.models import Count, OuterRef, Prefetch, Q, Subquery
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_http_methods

from ..background_jobs import BackgroundJobService, BackgroundJobType
from ..common.decorators import allow_unverified_2fa
from ..common.permissions import can_handle_reports
from ..common.rate_limits import consume_rate_limit
from ..common.utils import get_current_user, get_user_settings, is_request_authenticated, serialize_datetime
from ..core.services import get_client_ip
from ..models import SupportMessage, SupportThread, User
from ..telegram_binding_service import telegram_binding_service
from ..telegram_service import TelegramService
from ..user_notification_service import UserNotificationService

logger = logging.getLogger(__name__)
telegram_service = TelegramService()

REQUEST_TYPES = {"support", "bug", "feature", "question"}
THREAD_STATUSES = {
    SupportThread.STATUS_OPEN,
    SupportThread.STATUS_ANSWERED,
    SupportThread.STATUS_CLOSED,
}
VISIBLE_USER_STATUSES = {"open", "closed"}
SUPPORT_REQUEST_COOLDOWN = timezone.timedelta(hours=2)
SUPPORT_PAGE_SIZE = 10
SUPPORT_REQUEST_BURST_LIMIT = 5
SUPPORT_REQUEST_BURST_TTL_SECONDS = 300
MODERATOR_REPLY_RATE_LIMIT = 10
MODERATOR_REPLY_RATE_TTL_SECONDS = 300
MODERATOR_STATUS_RATE_LIMIT = 20
MODERATOR_STATUS_RATE_TTL_SECONDS = 300


def _get_session_user(request):
    if not is_request_authenticated(request):
        return None, JsonResponse({"success": False, "detail": "Требуется авторизация"}, status=401)

    user = get_current_user(request)
    if not user:
        return None, JsonResponse({"success": False, "detail": "Пользователь не найден"}, status=404)

    return user, None


def _require_moderator(request):
    user, error_response = _get_session_user(request)
    if error_response:
        return None, error_response

    if not can_handle_reports(user):
        return None, JsonResponse({"success": False, "detail": "Недостаточно прав"}, status=403)

    return user, None


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


def _is_loopback_request(request) -> bool:
    client_ip = (get_client_ip(request) or "").strip()
    return client_ip in {"127.0.0.1", "::1", "localhost"}


def _debug_tools_allowed(request) -> bool:
    if not settings.DEBUG:
        return False

    configured_token = getattr(settings, "TELEGRAM_INTERNAL_API_TOKEN", "").strip()
    if configured_token:
        return request.headers.get("X-Internal-Token", "") == configured_token

    return _is_loopback_request(request)


def _serialize_thread(thread):
    return {
        "id": thread.id,
        "subject": thread.subject,
        "request_type": thread.request_type,
        "status": thread.status,
        "created_at": serialize_datetime(thread.created_at),
        "updated_at": serialize_datetime(thread.updated_at),
        "last_message_at": serialize_datetime(thread.last_message_at),
        "created_by": {
            "id": thread.created_by.id,
            "fullname": thread.created_by.fullname,
            "student_code": thread.created_by.student_code,
            "faculty": thread.created_by.faculty,
        },
        "assigned_moderator": (
            {
                "id": thread.assigned_moderator.id,
                "fullname": thread.assigned_moderator.fullname,
                "student_code": thread.assigned_moderator.student_code,
            }
            if thread.assigned_moderator
            else None
        ),
        "messages_count": getattr(thread, "messages_count", 0),
        "preview": (getattr(thread, "preview", "") or "")[:120],
    }


def _serialize_message(message):
    return {
        "id": message.id,
        "body": message.body,
        "is_moderator_reply": message.is_moderator_reply,
        "created_at": serialize_datetime(message.created_at),
        "author": {
            "id": message.author.id,
            "fullname": message.author.fullname,
            "student_code": message.author.student_code,
            "role": message.author.role,
        },
    }


def _serialize_thread_with_messages(thread):
    payload = _serialize_thread(thread)
    payload["messages"] = [_serialize_message(message) for message in thread.messages.all()]
    return payload


def _annotated_threads_queryset(queryset):
    preview_subquery = SupportMessage.objects.filter(
        thread_id=OuterRef("pk")
    ).order_by("created_at").values("body")[:1]

    return queryset.annotate(
        messages_count=Count("messages", distinct=True),
        preview=Subquery(preview_subquery),
    )


@require_http_methods(["POST"])
def submit_support_request(request):
    try:
        user, error_response = _get_session_user(request)
        if error_response:
            return error_response

        try:
            data = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"success": False, "detail": "Неверный формат JSON"}, status=400)

        message = data.get("message", "").strip()
        request_type = data.get("type", "support")

        if not message:
            return JsonResponse({"success": False, "detail": "Сообщение не может быть пустым"}, status=400)
        if len(message) > 512:
            return JsonResponse({"success": False, "detail": "Сообщение слишком длинное (максимум 512 символов)"}, status=400)
        if request_type not in REQUEST_TYPES:
            request_type = "support"

        last_thread = SupportThread.objects.filter(created_by=user).only("created_at").order_by("-created_at").first()
        now = timezone.now()
        if last_thread and last_thread.created_at and now - last_thread.created_at < SUPPORT_REQUEST_COOLDOWN:
            next_allowed_at = last_thread.created_at + SUPPORT_REQUEST_COOLDOWN
            remaining = next_allowed_at - now
            remaining_minutes = max(1, int(remaining.total_seconds() // 60))
            hours = remaining_minutes // 60
            minutes = remaining_minutes % 60
            remaining_text = f"{hours} ч. {minutes} мин." if hours else f"{minutes} мин."
            return JsonResponse(
                {
                    "success": False,
                    "detail": f"Новое обращение можно создать через {remaining_text}",
                    "next_allowed_at": serialize_datetime(next_allowed_at),
                },
                status=429,
            )

        subject = message[:72].strip()
        if len(message) > 72:
            subject = f"{subject}..."

        allowed, retry_after = consume_rate_limit(
            "support-request-burst",
            user.student_code,
            SUPPORT_REQUEST_BURST_LIMIT,
            SUPPORT_REQUEST_BURST_TTL_SECONDS,
        )
        if not allowed:
            return JsonResponse(
                {
                    "success": False,
                    "detail": "РЎР»РёС€РєРѕРј РјРЅРѕРіРѕ РѕС‚РІРµС‚РѕРІ. РџРѕРїСЂРѕР±СѓР№С‚Рµ С‡СѓС‚СЊ РїРѕР·Р¶Рµ.",
                    "retry_after": retry_after,
                },
                status=429,
            )

        with transaction.atomic():
            thread = SupportThread.objects.create(
                created_by=user,
                subject=subject or "Новое обращение",
                request_type=request_type,
                status=SupportThread.STATUS_OPEN,
                last_message_at=now,
            )
            SupportMessage.objects.create(
                thread=thread,
                author=user,
                body=message,
                is_moderator_reply=False,
            )

        user_data = {
            "fullname": user.fullname,
            "student_code": user.student_code,
            "faculty": user.faculty,
            "created_at": now.strftime("%Y-%m-%d %H:%M:%S"),
            "thread_id": thread.id,
        }

        BackgroundJobService.enqueue(
            BackgroundJobType.SUPPORT_REQUEST_NOTIFICATION,
            {
                "user_data": user_data,
                "message": message,
                "request_type": request_type,
            },
        )

        return JsonResponse(
            {
                "success": True,
                "message": "Обращение создано и отправлено модераторам",
                "thread": _serialize_thread(thread),
            }
        )
    except Exception:
        logger.exception("Error processing support request")
        return JsonResponse({"success": False, "detail": "Внутренняя ошибка сервера"}, status=500)


@require_http_methods(["GET"])
def get_my_threads(request):
    try:
        user, error_response = _get_session_user(request)
        if error_response:
            return error_response

        page = _parse_positive_int(request.GET.get("page"), 1)
        page_size = _parse_positive_int(request.GET.get("page_size"), SUPPORT_PAGE_SIZE, maximum=SUPPORT_PAGE_SIZE)
        status_filter = request.GET.get("status", "open").strip().lower()
        search = request.GET.get("search", "").strip()

        queryset = SupportThread.objects.filter(created_by=user).select_related(
            "created_by",
            "assigned_moderator",
        ).order_by("-last_message_at")

        if status_filter == "open":
            queryset = queryset.exclude(status=SupportThread.STATUS_CLOSED)
        elif status_filter == "closed":
            queryset = queryset.filter(status=SupportThread.STATUS_CLOSED)

        if search:
            queryset = queryset.filter(
                Q(subject__icontains=search) | Q(messages__body__icontains=search)
            ).distinct()

        queryset = _annotated_threads_queryset(queryset)
        paginator = Paginator(queryset, page_size)
        page_obj = paginator.get_page(page)

        return JsonResponse(
            {
                "success": True,
                "threads": [_serialize_thread(thread) for thread in page_obj.object_list],
                "total": paginator.count,
                "page": page_obj.number,
                "page_size": page_size,
                "total_pages": paginator.num_pages or 1,
                "status": status_filter if status_filter in VISIBLE_USER_STATUSES else "open",
            }
        )
    except Exception:
        logger.exception("Failed to fetch own support threads")
        return JsonResponse({"success": False, "detail": "Р’РЅСѓС‚СЂРµРЅРЅСЏСЏ РѕС€РёР±РєР° СЃРµСЂРІРµСЂР°"}, status=500)


@require_http_methods(["GET"])
def get_my_thread_detail(request, thread_id):
    try:
        user, error_response = _get_session_user(request)
        if error_response:
            return error_response

        thread = SupportThread.objects.select_related("created_by", "assigned_moderator").prefetch_related(
            Prefetch("messages", queryset=SupportMessage.objects.order_by("created_at").select_related("author"))
        ).filter(id=thread_id, created_by=user).first()

        if not thread:
            return JsonResponse({"success": False, "detail": "РћР±СЂР°С‰РµРЅРёРµ РЅРµ РЅР°Р№РґРµРЅРѕ"}, status=404)

        return JsonResponse({"success": True, "thread": _serialize_thread_with_messages(thread)})
    except Exception:
        logger.exception("Failed to fetch own support thread detail")
        return JsonResponse({"success": False, "detail": "Р’РЅСѓС‚СЂРµРЅРЅСЏСЏ РѕС€РёР±РєР° СЃРµСЂРІРµСЂР°"}, status=500)


@require_http_methods(["GET"])
def get_moder_threads(request):
    try:
        _, error_response = _require_moderator(request)
        if error_response:
            return error_response

        page = _parse_positive_int(request.GET.get("page"), 1)
        page_size = _parse_positive_int(request.GET.get("page_size"), SUPPORT_PAGE_SIZE, maximum=SUPPORT_PAGE_SIZE)
        status_filter = request.GET.get("status", "all").strip().lower()
        type_filter = request.GET.get("type", "all").strip().lower()
        search = request.GET.get("search", "").strip()

        queryset = SupportThread.objects.select_related("created_by", "assigned_moderator").order_by("-last_message_at")

        if status_filter != "all" and status_filter in THREAD_STATUSES:
            queryset = queryset.filter(status=status_filter)
        if type_filter != "all" and type_filter in REQUEST_TYPES:
            queryset = queryset.filter(request_type=type_filter)
        if search:
            queryset = queryset.filter(
                Q(subject__icontains=search)
                | Q(created_by__fullname__icontains=search)
                | Q(created_by__student_code__icontains=search)
                | Q(messages__body__icontains=search)
            ).distinct()

        queryset = _annotated_threads_queryset(queryset)
        paginator = Paginator(queryset, page_size)
        page_obj = paginator.get_page(page)

        return JsonResponse(
            {
                "success": True,
                "threads": [_serialize_thread(thread) for thread in page_obj.object_list],
                "total": paginator.count,
                "page": page_obj.number,
                "page_size": page_size,
                "total_pages": paginator.num_pages or 1,
            }
        )
    except Exception:
        logger.exception("Failed to fetch support threads")
        return JsonResponse({"success": False, "detail": "Внутренняя ошибка сервера"}, status=500)


@require_http_methods(["GET"])
def get_moder_thread_detail(request, thread_id):
    try:
        _, error_response = _require_moderator(request)
        if error_response:
            return error_response

        thread = SupportThread.objects.select_related("created_by", "assigned_moderator").prefetch_related(
            Prefetch("messages", queryset=SupportMessage.objects.order_by("created_at").select_related("author"))
        ).filter(id=thread_id).first()

        if not thread:
            return JsonResponse({"success": False, "detail": "Обращение не найдено"}, status=404)

        return JsonResponse({"success": True, "thread": _serialize_thread_with_messages(thread)})
    except Exception:
        logger.exception("Failed to fetch support thread detail")
        return JsonResponse({"success": False, "detail": "Внутренняя ошибка сервера"}, status=500)


@require_http_methods(["POST"])
def reply_to_thread(request, thread_id):
    try:
        moderator, error_response = _require_moderator(request)
        if error_response:
            return error_response

        thread = SupportThread.objects.select_related("created_by").filter(id=thread_id).first()
        if not thread:
            return JsonResponse({"success": False, "detail": "Обращение не найдено"}, status=404)

        try:
            data = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"success": False, "detail": "Неверный формат JSON"}, status=400)

        body = data.get("message", "").strip()
        if not body:
            return JsonResponse({"success": False, "detail": "Ответ не может быть пустым"}, status=400)
        if len(body) > 2000:
            return JsonResponse({"success": False, "detail": "Ответ слишком длинный"}, status=400)

        allowed, retry_after = consume_rate_limit(
            "moderator-support-reply",
            f"{moderator.student_code}:{thread_id}",
            MODERATOR_REPLY_RATE_LIMIT,
            MODERATOR_REPLY_RATE_TTL_SECONDS,
        )
        if not allowed:
            return JsonResponse(
                {
                    "success": False,
                    "detail": "РЎР»РёС€РєРѕРј РјРЅРѕРіРѕ РѕС‚РІРµС‚РѕРІ. РџРѕРїСЂРѕР±СѓР№С‚Рµ С‡СѓС‚СЊ РїРѕР·Р¶Рµ.",
                    "retry_after": retry_after,
                },
                status=429,
            )

        with transaction.atomic():
            message = SupportMessage.objects.create(
                thread=thread,
                author=moderator,
                body=body,
                is_moderator_reply=True,
            )
            thread.status = SupportThread.STATUS_ANSWERED
            thread.assigned_moderator = moderator
            thread.last_message_at = timezone.now()
            thread.save(update_fields=["status", "assigned_moderator", "last_message_at", "updated_at"])

        try:
            if get_user_settings(thread.created_by).notify_support_replies:
                telegram_binding_service.send_user_notification_sync(
                    thread.created_by,
                    (
                        "Bentum: ответ на обращение\n\n"
                        f"Тема: {thread.subject}\n"
                        f"Модератор: {moderator.fullname}\n\n"
                        f"{body[:600]}"
                    ),
                )
        except Exception:
            logger.exception("Failed to send support reply notification for thread %s", thread.id)

        return JsonResponse({"success": True, "message": _serialize_message(message)})
    except Exception:
        logger.exception("Failed to reply to support thread")
        return JsonResponse({"success": False, "detail": "Внутренняя ошибка сервера"}, status=500)


@require_http_methods(["POST"])
def update_thread_status(request, thread_id):
    try:
        moderator, error_response = _require_moderator(request)
        if error_response:
            return error_response

        thread = SupportThread.objects.select_related("created_by", "assigned_moderator").prefetch_related(
            Prefetch("messages", queryset=SupportMessage.objects.order_by("created_at").select_related("author"))
        ).filter(id=thread_id).first()
        if not thread:
            return JsonResponse({"success": False, "detail": "РћР±СЂР°С‰РµРЅРёРµ РЅРµ РЅР°Р№РґРµРЅРѕ"}, status=404)

        try:
            data = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"success": False, "detail": "РќРµРІРµСЂРЅС‹Р№ С„РѕСЂРјР°С‚ JSON"}, status=400)

        status_value = (data.get("status") or "").strip().lower()
        if status_value not in THREAD_STATUSES:
            return JsonResponse({"success": False, "detail": "РќРµРєРѕСЂСЂРµРєС‚РЅС‹Р№ СЃС‚Р°С‚СѓСЃ"}, status=400)

        allowed, retry_after = consume_rate_limit(
            "moderator-support-status",
            f"{moderator.student_code}:{thread_id}",
            MODERATOR_STATUS_RATE_LIMIT,
            MODERATOR_STATUS_RATE_TTL_SECONDS,
        )
        if not allowed:
            return JsonResponse(
                {
                    "success": False,
                    "detail": "РЎР»РёС€РєРѕРј С‡Р°СЃС‚Р°СЏ СЃРјРµРЅР° СЃС‚Р°С‚СѓСЃР°. РџРѕРїСЂРѕР±СѓР№С‚Рµ РїРѕР·Р¶Рµ.",
                    "retry_after": retry_after,
                },
                status=429,
            )

        update_fields = ["status", "updated_at"]
        thread.status = status_value
        if status_value != SupportThread.STATUS_CLOSED:
            thread.assigned_moderator = moderator
            update_fields.append("assigned_moderator")

        thread.save(update_fields=update_fields)
        return JsonResponse({"success": True, "thread": _serialize_thread_with_messages(thread)})
    except Exception:
        logger.exception("Failed to update support thread status")
        return JsonResponse({"success": False, "detail": "Р’РЅСѓС‚СЂРµРЅРЅСЏСЏ РѕС€РёР±РєР° СЃРµСЂРІРµСЂР°"}, status=500)


@allow_unverified_2fa
@require_http_methods(["GET"])
def test_telegram_connection(request):
    if not _debug_tools_allowed(request):
        return JsonResponse({"success": False, "detail": "Доступно только в режиме разработки"}, status=403)

    try:
        is_connected, message = telegram_service.test_connection_sync()
        return JsonResponse(
            {
                "success": is_connected,
                "message": message,
                "bot_configured": bool(getattr(settings, "TELEGRAM_BOT_TOKEN", None)),
                "chat_configured": bool(getattr(settings, "TELEGRAM_CHAT_ID", None)),
                "topic_id": getattr(settings, "TELEGRAM_TOPIC_ID", None),
                "topic_configured": bool(getattr(settings, "TELEGRAM_TOPIC_ID", None)),
            }
        )
    except Exception:
        logger.exception("Error testing Telegram connection")
        return JsonResponse({"success": False, "detail": "Внутренняя ошибка сервера"}, status=500)


@allow_unverified_2fa
@require_http_methods(["GET"])
def test_new_user_notification(request):
    if not _debug_tools_allowed(request):
        return JsonResponse({"success": False, "detail": "Доступно только в режиме разработки"}, status=403)

    try:
        notification_service = UserNotificationService()
        return JsonResponse(notification_service.test_connection())
    except Exception:
        logger.exception("Error testing new user notification")
        return JsonResponse({"success": False, "error": "Внутренняя ошибка сервера"}, status=500)


@allow_unverified_2fa
@require_http_methods(["POST"])
def send_new_user_notification(request):
    try:
        if not _debug_tools_allowed(request):
            return JsonResponse({"success": False, "error": "Р”РѕСЃС‚СѓРї Р·Р°РїСЂРµС‰С‘РЅ"}, status=403)

        data = json.loads(request.body)
        required_fields = ["fullname", "student_code"]
        for field in required_fields:
            if not data.get(field):
                return JsonResponse({"success": False, "error": f"Отсутствует обязательное поле: {field}"}, status=400)

        BackgroundJobService.enqueue(
            BackgroundJobType.NEW_USER_NOTIFICATION,
            {"user_data": data},
        )

        return JsonResponse({"success": True, "message": "Уведомление о новом пользователе поставлено в очередь"})
    except json.JSONDecodeError:
        return JsonResponse({"success": False, "error": "Неверный формат JSON данных"}, status=400)
    except Exception:
        logger.exception("Error sending new user notification")
        return JsonResponse({"success": False, "error": "Внутренняя ошибка сервера"}, status=500)
