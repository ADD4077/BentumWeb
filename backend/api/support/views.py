import logging

from django.conf import settings
from django.core.paginator import Paginator
from django.db import transaction
from django.db.models import Count, OuterRef, Prefetch, Q, Subquery
from django.http import JsonResponse
from django.utils import timezone
from django.utils.decorators import method_decorator
from rest_framework.views import APIView

from ..background_jobs import BackgroundJobService, BackgroundJobType
from ..common.decorators import allow_unverified_2fa
from ..common.drf import SessionUserAPIView
from ..common.permissions import can_handle_reports
from ..common.rate_limits import consume_rate_limit
from ..common.utils import get_user_settings, serialize_datetime
from ..core.services import get_client_ip
from ..models import SupportMessage, SupportThread
from ..notification_service import NotificationService
from ..telegram_binding_service import telegram_binding_service
from ..telegram_service import TelegramService
from ..user_notification_service import UserNotificationService
from .serializers import (
    DebugNewUserNotificationSerializer,
    ModerThreadsQuerySerializer,
    SupportReplySerializer,
    SupportRequestSerializer,
    SupportStatusSerializer,
    SupportThreadsQuerySerializer,
)

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
USER_REPLY_MAX_LENGTH = 2000
USER_REPLY_RATE_LIMIT = 6
USER_REPLY_RATE_TTL_SECONDS = 300
USER_REPLY_COOLDOWN_SECONDS = 15
MODERATOR_REPLY_RATE_LIMIT = 10
MODERATOR_REPLY_RATE_TTL_SECONDS = 300
MODERATOR_STATUS_RATE_LIMIT = 20
MODERATOR_STATUS_RATE_TTL_SECONDS = 300


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
        "can_user_reply": thread.status != SupportThread.STATUS_CLOSED,
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


class SupportSessionAPIView(SessionUserAPIView):
    def get_session_user_or_error(self, request):
        return self.get_session_user(request)


class ModeratorSupportAPIView(SupportSessionAPIView):
    def get_moderator_user(self, request):
        user, error_response = self.get_session_user_or_error(request)
        if error_response:
            return None, error_response

        if not can_handle_reports(user):
            return None, self.error_response("Недостаточно прав", http_status=403)

        return user, None


class SubmitSupportRequestView(SupportSessionAPIView):
    def post(self, request):
        try:
            user, error_response = self.get_session_user_or_error(request)
            if error_response:
                return error_response

            serializer = SupportRequestSerializer(data=request.data)
            if not serializer.is_valid():
                message = (serializer.initial_data or {}).get("message", "")
                if not str(message).strip():
                    return self.error_response("Сообщение не может быть пустым", http_status=400)
                return self.error_response(
                    "Сообщение слишком длинное (максимум 512 символов)",
                    http_status=400,
                )

            message = serializer.validated_data["message"].strip()
            request_type = serializer.validated_data.get("type", "support").strip().lower()
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
                return self.error_response(
                    f"Новое обращение можно создать через {remaining_text}",
                    http_status=429,
                    next_allowed_at=serialize_datetime(next_allowed_at),
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
                return self.error_response(
                    "Слишком много обращений. Попробуйте чуть позже.",
                    http_status=429,
                    retry_after=retry_after,
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

            return self.success_response(
                message="Обращение создано и отправлено модераторам",
                thread=_serialize_thread(thread),
            )
        except Exception:
            logger.exception("Error processing support request")
            return self.error_response("Внутренняя ошибка сервера", http_status=500)


class MyThreadsView(SupportSessionAPIView):
    def get(self, request):
        try:
            user, error_response = self.get_session_user_or_error(request)
            if error_response:
                return error_response

            serializer = SupportThreadsQuerySerializer(data=request.query_params)
            serializer.is_valid(raise_exception=False)
            page = serializer.validated_data.get("page", 1)
            page_size = serializer.validated_data.get("page_size", SUPPORT_PAGE_SIZE)
            status_filter = serializer.validated_data.get("status", "open").strip().lower()
            search = serializer.validated_data.get("search", "").strip()

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

            return self.success_response(
                threads=[_serialize_thread(thread) for thread in page_obj.object_list],
                total=paginator.count,
                page=page_obj.number,
                page_size=page_size,
                total_pages=paginator.num_pages or 1,
                status=status_filter if status_filter in VISIBLE_USER_STATUSES else "open",
            )
        except Exception:
            logger.exception("Failed to fetch own support threads")
            return self.error_response("Внутренняя ошибка сервера", http_status=500)


class MyThreadDetailView(SupportSessionAPIView):
    def get(self, request, thread_id):
        try:
            user, error_response = self.get_session_user_or_error(request)
            if error_response:
                return error_response

            thread = SupportThread.objects.select_related("created_by", "assigned_moderator").prefetch_related(
                Prefetch("messages", queryset=SupportMessage.objects.order_by("created_at").select_related("author"))
            ).filter(id=thread_id, created_by=user).first()

            if not thread:
                return self.error_response("Обращение не найдено", http_status=404)

            return self.success_response(thread=_serialize_thread_with_messages(thread))
        except Exception:
            logger.exception("Failed to fetch own support thread detail")
            return self.error_response("Внутренняя ошибка сервера", http_status=500)


class ModerThreadsView(ModeratorSupportAPIView):
    def get(self, request):
        try:
            _, error_response = self.get_moderator_user(request)
            if error_response:
                return error_response

            serializer = ModerThreadsQuerySerializer(data=request.query_params)
            serializer.is_valid(raise_exception=False)
            page = serializer.validated_data.get("page", 1)
            page_size = serializer.validated_data.get("page_size", SUPPORT_PAGE_SIZE)
            status_filter = serializer.validated_data.get("status", "all").strip().lower()
            type_filter = serializer.validated_data.get("type", "all").strip().lower()
            search = serializer.validated_data.get("search", "").strip()

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

            return self.success_response(
                threads=[_serialize_thread(thread) for thread in page_obj.object_list],
                total=paginator.count,
                page=page_obj.number,
                page_size=page_size,
                total_pages=paginator.num_pages or 1,
            )
        except Exception:
            logger.exception("Failed to fetch support threads")
            return self.error_response("Внутренняя ошибка сервера", http_status=500)


class ModerThreadDetailView(ModeratorSupportAPIView):
    def get(self, request, thread_id):
        try:
            _, error_response = self.get_moderator_user(request)
            if error_response:
                return error_response

            thread = SupportThread.objects.select_related("created_by", "assigned_moderator").prefetch_related(
                Prefetch("messages", queryset=SupportMessage.objects.order_by("created_at").select_related("author"))
            ).filter(id=thread_id).first()

            if not thread:
                return self.error_response("Обращение не найдено", http_status=404)

            return self.success_response(thread=_serialize_thread_with_messages(thread))
        except Exception:
            logger.exception("Failed to fetch support thread detail")
            return self.error_response("Внутренняя ошибка сервера", http_status=500)


class ReplyToOwnThreadView(SupportSessionAPIView):
    def post(self, request, thread_id):
        try:
            user, error_response = self.get_session_user_or_error(request)
            if error_response:
                return error_response

            thread = SupportThread.objects.select_related("created_by", "assigned_moderator").filter(
                id=thread_id,
                created_by=user,
            ).first()
            if not thread:
                return self.error_response("Обращение не найдено", http_status=404)

            if thread.status == SupportThread.STATUS_CLOSED:
                return self.error_response("Нельзя писать в закрытое обращение", http_status=409)

            serializer = SupportReplySerializer(data=request.data)
            if not serializer.is_valid():
                body = (serializer.initial_data or {}).get("message", "")
                if not str(body).strip():
                    return self.error_response("Сообщение не может быть пустым", http_status=400)
                return self.error_response(
                    f"Сообщение слишком длинное (максимум {USER_REPLY_MAX_LENGTH} символов)",
                    http_status=400,
                )

            body = serializer.validated_data["message"].strip()

            cooldown_allowed, cooldown_retry_after = consume_rate_limit(
                "support-user-reply-cooldown",
                f"{user.student_code}:{thread_id}",
                1,
                USER_REPLY_COOLDOWN_SECONDS,
            )
            if not cooldown_allowed:
                return self.error_response(
                    "Слишком частые сообщения. Попробуйте чуть позже.",
                    http_status=429,
                    retry_after=cooldown_retry_after,
                )

            allowed, retry_after = consume_rate_limit(
                "support-user-reply",
                f"{user.student_code}:{thread_id}",
                USER_REPLY_RATE_LIMIT,
                USER_REPLY_RATE_TTL_SECONDS,
            )
            if not allowed:
                return self.error_response(
                    "Слишком много сообщений. Попробуйте чуть позже.",
                    http_status=429,
                    retry_after=retry_after,
                )

            with transaction.atomic():
                message = SupportMessage.objects.create(
                    thread=thread,
                    author=user,
                    body=body,
                    is_moderator_reply=False,
                )
                thread.status = SupportThread.STATUS_OPEN
                thread.last_message_at = timezone.now()
                thread.save(update_fields=["status", "last_message_at", "updated_at"])

            return self.success_response(message=_serialize_message(message))
        except Exception:
            logger.exception("Failed to add user reply to support thread")
            return self.error_response("Внутренняя ошибка сервера", http_status=500)


class ReplyToThreadView(ModeratorSupportAPIView):
    def post(self, request, thread_id):
        try:
            moderator, error_response = self.get_moderator_user(request)
            if error_response:
                return error_response

            thread = SupportThread.objects.select_related("created_by").filter(id=thread_id).first()
            if not thread:
                return self.error_response("Обращение не найдено", http_status=404)

            serializer = SupportReplySerializer(data=request.data)
            if not serializer.is_valid():
                body = (serializer.initial_data or {}).get("message", "")
                if not str(body).strip():
                    return self.error_response("Ответ не может быть пустым", http_status=400)
                return self.error_response("Ответ слишком длинный", http_status=400)

            body = serializer.validated_data["message"].strip()

            allowed, retry_after = consume_rate_limit(
                "moderator-support-reply",
                f"{moderator.student_code}:{thread_id}",
                MODERATOR_REPLY_RATE_LIMIT,
                MODERATOR_REPLY_RATE_TTL_SECONDS,
            )
            if not allowed:
                return self.error_response(
                    "Слишком много ответов. Попробуйте чуть позже.",
                    http_status=429,
                    retry_after=retry_after,
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
                NotificationService.create(
                    thread.created_by,
                    notification_type="support_reply",
                    title="Новый ответ в поддержке",
                    body=f"{thread.subject}\n\n{body[:300]}",
                    metadata={"thread_id": thread.id},
                )

            try:
                if get_user_settings(thread.created_by).notify_support_replies:
                    telegram_binding_service.send_user_notification_sync(
                        thread.created_by,
                        (
                            "Бентум: ответ на обращение\n\n"
                            f"Тема: {thread.subject}\n"
                            f"Модератор: {moderator.fullname}\n\n"
                            f"{body[:600]}"
                        ),
                    )
            except Exception:
                logger.exception("Failed to send support reply notification for thread %s", thread.id)

            return self.success_response(message=_serialize_message(message))
        except Exception:
            logger.exception("Failed to reply to support thread")
            return self.error_response("Внутренняя ошибка сервера", http_status=500)


class UpdateThreadStatusView(ModeratorSupportAPIView):
    def post(self, request, thread_id):
        try:
            moderator, error_response = self.get_moderator_user(request)
            if error_response:
                return error_response

            thread = SupportThread.objects.select_related("created_by", "assigned_moderator").prefetch_related(
                Prefetch("messages", queryset=SupportMessage.objects.order_by("created_at").select_related("author"))
            ).filter(id=thread_id).first()
            if not thread:
                return self.error_response("Обращение не найдено", http_status=404)

            serializer = SupportStatusSerializer(data=request.data)
            if not serializer.is_valid():
                return self.error_response("Некорректный статус", http_status=400)

            status_value = serializer.validated_data["status"].strip().lower()
            if status_value not in THREAD_STATUSES:
                return self.error_response("Некорректный статус", http_status=400)

            allowed, retry_after = consume_rate_limit(
                "moderator-support-status",
                f"{moderator.student_code}:{thread_id}",
                MODERATOR_STATUS_RATE_LIMIT,
                MODERATOR_STATUS_RATE_TTL_SECONDS,
            )
            if not allowed:
                return self.error_response(
                    "Слишком частая смена статуса. Попробуйте позже.",
                    http_status=429,
                    retry_after=retry_after,
                )

            update_fields = ["status", "updated_at"]
            thread.status = status_value
            if status_value != SupportThread.STATUS_CLOSED:
                thread.assigned_moderator = moderator
                update_fields.append("assigned_moderator")

            thread.save(update_fields=update_fields)
            return self.success_response(thread=_serialize_thread_with_messages(thread))
        except Exception:
            logger.exception("Failed to update support thread status")
            return self.error_response("Внутренняя ошибка сервера", http_status=500)


@method_decorator(allow_unverified_2fa, name="dispatch")
class TestTelegramConnectionView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
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


@method_decorator(allow_unverified_2fa, name="dispatch")
class TestNewUserNotificationView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        if not _debug_tools_allowed(request):
            return JsonResponse({"success": False, "detail": "Доступно только в режиме разработки"}, status=403)

        try:
            notification_service = UserNotificationService()
            return JsonResponse(notification_service.test_connection())
        except Exception:
            logger.exception("Error testing new user notification")
            return JsonResponse({"success": False, "error": "Внутренняя ошибка сервера"}, status=500)


@method_decorator(allow_unverified_2fa, name="dispatch")
class SendNewUserNotificationView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        try:
            if not _debug_tools_allowed(request):
                return JsonResponse({"success": False, "error": "Доступ запрещён"}, status=403)

            serializer = DebugNewUserNotificationSerializer(data=request.data)
            if not serializer.is_valid():
                missing_field = "fullname"
                if serializer.initial_data.get("fullname") and not serializer.initial_data.get("student_code"):
                    missing_field = "student_code"
                return JsonResponse(
                    {"success": False, "error": f"Отсутствует обязательное поле: {missing_field}"},
                    status=400,
                )

            BackgroundJobService.enqueue(
                BackgroundJobType.NEW_USER_NOTIFICATION,
                {"user_data": serializer.validated_data},
            )

            return JsonResponse({"success": True, "message": "Уведомление о новом пользователе поставлено в очередь"})
        except Exception:
            logger.exception("Error sending new user notification")
            return JsonResponse({"success": False, "error": "Внутренняя ошибка сервера"}, status=500)


submit_support_request = SubmitSupportRequestView.as_view()
get_my_threads = MyThreadsView.as_view()
get_my_thread_detail = MyThreadDetailView.as_view()
get_moder_threads = ModerThreadsView.as_view()
get_moder_thread_detail = ModerThreadDetailView.as_view()
reply_to_own_thread = ReplyToOwnThreadView.as_view()
reply_to_thread = ReplyToThreadView.as_view()
update_thread_status = UpdateThreadStatusView.as_view()
test_telegram_connection = TestTelegramConnectionView.as_view()
test_new_user_notification = TestNewUserNotificationView.as_view()
send_new_user_notification = SendNewUserNotificationView.as_view()
