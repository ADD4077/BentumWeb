import logging

from django.core.paginator import Paginator
from django.db import transaction
from django.http import JsonResponse
from rest_framework.views import APIView

from ..activity_service import log_activity_event
from ..ban_service import BanService
from ..common.drf import SessionUserAPIView
from ..common.permissions import can_access_admin_panel
from ..models import ActivityEvent, Administration, User
from .serializers import (
    AdministrationHistoryQuerySerializer,
    AdministratorListQuerySerializer,
    AppointAdministratorSerializer,
    RemoveAdministratorSerializer,
)

logger = logging.getLogger(__name__)


class AdminSessionAPIView(SessionUserAPIView):
    def get_admin_user(self, request):
        user, error_response = self.get_session_user(request)
        if error_response:
            return None, error_response

        if not can_access_admin_panel(user):
            return None, self.error_response("Недостаточно прав", http_status=403)

        return user, None


class AppointAdministratorView(AdminSessionAPIView):
    def post(self, request):
        current_user, error_response = self.get_admin_user(request)
        if error_response:
            return error_response

        serializer = AppointAdministratorSerializer(data=request.data)
        if not serializer.is_valid():
            return self.error_response("Не указан код студента", http_status=400)

        target_student_code = serializer.validated_data["student_code"]
        notes = serializer.validated_data["notes"]

        try:
            target_user = User.objects.get(student_code=target_student_code)
        except User.DoesNotExist:
            return self.error_response("Пользователь не найден", http_status=404)

        if Administration.objects.filter(administrator=target_user, is_active=True).exists():
            return self.error_response("Пользователь уже является администратором", http_status=400)

        try:
            with transaction.atomic():
                admin_record = Administration.objects.create(
                    administrator=target_user,
                    appointed_by=current_user,
                    notes=notes,
                )

            return self.success_response(
                message=f"Пользователь {target_user.fullname} назначен администратором",
                administration={
                    "id": admin_record.id,
                    "administrator": {
                        "id": target_user.id,
                        "student_code": target_user.student_code,
                        "fullname": target_user.fullname,
                        "faculty": target_user.faculty,
                    },
                    "appointed_by": {
                        "id": current_user.id,
                        "student_code": current_user.student_code,
                        "fullname": current_user.fullname,
                    },
                    "appointed_at": admin_record.appointed_at.isoformat(),
                    "notes": admin_record.notes,
                },
            )
        except Exception:
            logger.exception("Failed to appoint administrator")
            return self.error_response("Внутренняя ошибка сервера", http_status=500)


class RemoveAdministratorView(AdminSessionAPIView):
    def post(self, request):
        current_user, error_response = self.get_admin_user(request)
        if error_response:
            return error_response

        serializer = RemoveAdministratorSerializer(data=request.data)
        if not serializer.is_valid():
            return self.error_response("Не указан код студента", http_status=400)

        target_student_code = serializer.validated_data["student_code"]

        try:
            target_user = User.objects.get(student_code=target_student_code)
        except User.DoesNotExist:
            return self.error_response("Пользователь не найден", http_status=404)

        try:
            admin_record = Administration.objects.get(administrator=target_user, is_active=True)
        except Administration.DoesNotExist:
            return self.error_response("Пользователь не является администратором", http_status=400)

        try:
            admin_record.is_active = False
            admin_record.save(update_fields=["is_active"])

            log_activity_event(
                ActivityEvent.EVENT_ADMIN_REMOVED,
                user=target_user,
                actor=current_user,
                details=f"Пользователь {target_user.fullname} снят с должности администратора",
            )

            return self.success_response(
                message=f"Пользователь {target_user.fullname} снят с должности администратора",
            )
        except Exception:
            logger.exception("Failed to remove administrator")
            return self.error_response("Внутренняя ошибка сервера", http_status=500)


class AdministratorsListView(AdminSessionAPIView):
    def get(self, request):
        _, error_response = self.get_admin_user(request)
        if error_response:
            return error_response

        serializer = AdministratorListQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=False)
        page = serializer.validated_data.get("page", 1)
        per_page = serializer.validated_data.get("per_page", 20)

        try:
            admin_records = (
                Administration.objects.filter(is_active=True)
                .select_related("administrator", "appointed_by")
                .order_by("-appointed_at")
            )

            paginator = Paginator(admin_records, per_page)
            page_obj = paginator.get_page(page)

            admin_student_codes = [record.administrator.student_code for record in page_obj.object_list]
            ban_statuses = BanService.get_ban_statuses(admin_student_codes)

            administrators = []
            for record in page_obj.object_list:
                ban_status = ban_statuses.get(record.administrator.student_code, {"is_banned": False})
                administrators.append(
                    {
                        "id": record.id,
                        "administrator": {
                            "id": record.administrator.id,
                            "student_code": record.administrator.student_code,
                            "fullname": record.administrator.fullname,
                            "faculty": record.administrator.faculty,
                            "is_banned": ban_status["is_banned"],
                        },
                        "appointed_by": (
                            {
                                "id": record.appointed_by.id,
                                "student_code": record.appointed_by.student_code,
                                "fullname": record.appointed_by.fullname,
                            }
                            if record.appointed_by
                            else None
                        ),
                        "appointed_at": record.appointed_at.isoformat(),
                        "notes": record.notes,
                    }
                )

            return self.success_response(
                administrators=administrators,
                pagination={
                    "current_page": page_obj.number,
                    "total_pages": paginator.num_pages,
                    "total_items": paginator.count,
                    "has_next": page_obj.has_next(),
                    "has_previous": page_obj.has_previous(),
                },
            )
        except Exception:
            logger.exception("Failed to get administrators")
            return self.error_response("Внутренняя ошибка сервера", http_status=500)


class AdministrationHistoryView(AdminSessionAPIView):
    def get(self, request):
        _, error_response = self.get_admin_user(request)
        if error_response:
            return error_response

        serializer = AdministrationHistoryQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=False)
        target_student_code = serializer.validated_data.get("student_code")

        try:
            if target_student_code:
                try:
                    target_user = User.objects.get(student_code=target_student_code)
                except User.DoesNotExist:
                    return self.error_response("Пользователь не найден", http_status=404)

                records = Administration.objects.filter(administrator=target_user).select_related(
                    "administrator",
                    "appointed_by",
                ).order_by("-appointed_at")
            else:
                records = Administration.objects.all().select_related(
                    "administrator",
                    "appointed_by",
                ).order_by("-appointed_at")

            history = []
            for record in records:
                history.append(
                    {
                        "id": record.id,
                        "administrator": {
                            "id": record.administrator.id,
                            "student_code": record.administrator.student_code,
                            "fullname": record.administrator.fullname,
                        },
                        "appointed_by": (
                            {
                                "id": record.appointed_by.id,
                                "student_code": record.appointed_by.student_code,
                                "fullname": record.appointed_by.fullname,
                            }
                            if record.appointed_by
                            else None
                        ),
                        "appointed_at": record.appointed_at.isoformat(),
                        "is_active": record.is_active,
                        "notes": record.notes,
                    }
                )

            return self.success_response(
                history=history,
                total=len(history),
            )
        except Exception:
            logger.exception("Failed to get administration history")
            return self.error_response("Внутренняя ошибка сервера", http_status=500)


appoint_administrator = AppointAdministratorView.as_view()
remove_administrator = RemoveAdministratorView.as_view()
get_administrators = AdministratorsListView.as_view()
get_administration_history = AdministrationHistoryView.as_view()
