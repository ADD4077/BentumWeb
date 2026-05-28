import logging

from rest_framework import status

from ..common.drf import SessionUserAPIView
from ..models import UserNotification
from ..notification_service import NotificationService
from .serializers import NotificationListQuerySerializer, NotificationSerializer

logger = logging.getLogger(__name__)

RECENT_PAGE_SIZE = 3


class RecentNotificationsView(SessionUserAPIView):
    def get(self, request):
        try:
            user, error_response = self.get_session_user(request)
            if error_response:
                return error_response

            rows = list(UserNotification.objects.filter(user=user).order_by("-created_at")[:RECENT_PAGE_SIZE])
            unread_count = UserNotification.objects.filter(user=user, is_read=False).count()
            serializer = NotificationSerializer(rows, many=True)
            return self.success_response(
                notifications=serializer.data,
                unread_count=unread_count,
            )
        except Exception:
            logger.exception("Failed to fetch recent notifications")
            return self.error_response("Внутренняя ошибка сервера", http_status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class NotificationsView(SessionUserAPIView):
    def get(self, request):
        try:
            user, error_response = self.get_session_user(request)
            if error_response:
                return error_response

            query_serializer = NotificationListQuerySerializer(data=request.query_params)
            query_serializer.is_valid(raise_exception=False)
            query_data = query_serializer.validated_data or {"page": 1, "page_size": 20}
            page = query_data["page"]
            page_size = query_data["page_size"]

            queryset = UserNotification.objects.filter(user=user).order_by("-created_at")
            total = queryset.count()
            offset = (page - 1) * page_size
            rows = list(queryset[offset:offset + page_size])
            serializer = NotificationSerializer(rows, many=True)

            return self.success_response(
                notifications=serializer.data,
                page=page,
                page_size=page_size,
                total=total,
                has_more=offset + len(rows) < total,
                unread_count=queryset.filter(is_read=False).count(),
            )
        except Exception:
            logger.exception("Failed to fetch notifications")
            return self.error_response("Внутренняя ошибка сервера", http_status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MarkAllNotificationsReadView(SessionUserAPIView):
    def post(self, request):
        try:
            user, error_response = self.get_session_user(request)
            if error_response:
                return error_response

            updated = NotificationService.mark_all_read(user)
            return self.success_response(updated=updated)
        except Exception:
            logger.exception("Failed to mark notifications as read")
            return self.error_response("Внутренняя ошибка сервера", http_status=status.HTTP_500_INTERNAL_SERVER_ERROR)


get_recent_notifications = RecentNotificationsView.as_view()
get_notifications = NotificationsView.as_view()
mark_all_notifications_read = MarkAllNotificationsReadView.as_view()
