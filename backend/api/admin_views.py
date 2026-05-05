import json
import logging

from django.core.paginator import Paginator
from django.db import transaction
from django.views.decorators.http import require_http_methods

from .ban_service import BanService
from .common.permissions import can_access_admin_panel
from .common.responses import (
    auth_required_response,
    error_response,
    not_found_response,
    permission_denied_response,
    success_response,
)
from .common.utils import get_current_user, is_request_authenticated
from .models import Administration, User

logger = logging.getLogger(__name__)


def _get_admin_user(request):
    if not is_request_authenticated(request):
        return None, auth_required_response()

    current_user = get_current_user(request)
    if current_user is None:
        return None, not_found_response("Пользователь не найден")

    if not can_access_admin_panel(current_user):
        return None, permission_denied_response()

    return current_user, None


@require_http_methods(["POST"])
def appoint_administrator(request):
    """Назначение администратора."""
    current_user, error_response_obj = _get_admin_user(request)
    if error_response_obj:
        return error_response_obj

    try:
        data = json.loads(request.body or "{}")
        target_student_code = data.get("student_code")
        notes = data.get("notes", "")

        if not target_student_code:
            return error_response("Не указан код студента")

        try:
            target_user = User.objects.get(student_code=target_student_code)
        except User.DoesNotExist:
            return not_found_response("Пользователь не найден")

        already_admin = Administration.objects.filter(administrator=target_user, is_active=True).exists()
        if already_admin:
            return error_response("Пользователь уже является администратором")

        with transaction.atomic():
            admin_record = Administration.objects.create(
                administrator=target_user,
                appointed_by=current_user,
                notes=notes,
            )

        return success_response(
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
    except json.JSONDecodeError:
        return error_response("Неверный формат данных")
    except Exception:
        logger.exception("Failed to appoint administrator")
        return error_response("Внутренняя ошибка сервера", http_status=500)


@require_http_methods(["POST"])
def remove_administrator(request):
    """Снятие администратора с должности."""
    current_user, error_response_obj = _get_admin_user(request)
    if error_response_obj:
        return error_response_obj

    try:
        data = json.loads(request.body or "{}")
        target_student_code = data.get("student_code")

        if not target_student_code:
            return error_response("Не указан код студента")

        try:
            target_user = User.objects.get(student_code=target_student_code)
        except User.DoesNotExist:
            return not_found_response("Пользователь не найден")

        try:
            admin_record = Administration.objects.get(administrator=target_user, is_active=True)
        except Administration.DoesNotExist:
            return error_response("Пользователь не является администратором")

        admin_record.is_active = False
        admin_record.save(update_fields=["is_active"])

        return success_response(
            message=f"Пользователь {target_user.fullname} снят с должности администратора",
        )
    except json.JSONDecodeError:
        return error_response("Неверный формат данных")
    except Exception:
        logger.exception("Failed to remove administrator")
        return error_response("Внутренняя ошибка сервера", http_status=500)


@require_http_methods(["GET"])
def get_administrators(request):
    """Получение списка активных администраторов."""
    _, error_response_obj = _get_admin_user(request)
    if error_response_obj:
        return error_response_obj

    try:
        page = int(request.GET.get("page", 1))
        per_page = int(request.GET.get("per_page", 20))

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
                    "appointed_by": {
                        "id": record.appointed_by.id,
                        "student_code": record.appointed_by.student_code,
                        "fullname": record.appointed_by.fullname,
                    },
                    "appointed_at": record.appointed_at.isoformat(),
                    "notes": record.notes,
                }
            )

        return success_response(
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
        return error_response("Внутренняя ошибка сервера", http_status=500)
