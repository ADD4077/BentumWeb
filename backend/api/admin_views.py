import json
import logging

from django.core.paginator import Paginator
from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from .ban_service import BanService
from .models import Administration, User

logger = logging.getLogger(__name__)


def _get_admin_user(request):
    if not request.session.session_key:
        return None, JsonResponse(
            {"success": False, "detail": "Требуется авторизация"},
            status=401,
        )

    try:
        current_user = User.objects.get(student_code=request.session.get("student_code"))
    except User.DoesNotExist:
        return None, JsonResponse(
            {"success": False, "detail": "Пользователь не найден"},
            status=404,
        )

    is_admin = Administration.objects.filter(
        administrator=current_user,
        is_active=True,
    ).exists()
    if not is_admin:
        return None, JsonResponse(
            {"success": False, "detail": "Недостаточно прав"},
            status=403,
        )

    return current_user, None


@require_http_methods(["POST"])
def appoint_administrator(request):
    """Назначение администратора."""
    current_user, error_response = _get_admin_user(request)
    if error_response:
        return error_response

    try:
        data = json.loads(request.body)
        target_student_code = data.get("student_code")
        notes = data.get("notes", "")

        if not target_student_code:
            return JsonResponse(
                {"success": False, "detail": "Не указан код студента"},
                status=400,
            )

        try:
            target_user = User.objects.get(student_code=target_student_code)
        except User.DoesNotExist:
            return JsonResponse(
                {"success": False, "detail": "Пользователь не найден"},
                status=404,
            )

        already_admin = Administration.objects.filter(
            administrator=target_user,
            is_active=True,
        ).exists()
        if already_admin:
            return JsonResponse(
                {
                    "success": False,
                    "detail": "Пользователь уже является администратором",
                },
                status=400,
            )

        with transaction.atomic():
            admin_record = Administration.objects.create(
                administrator=target_user,
                appointed_by=current_user,
                notes=notes,
            )

        return JsonResponse(
            {
                "success": True,
                "message": (
                    f"Пользователь {target_user.fullname} назначен администратором"
                ),
                "administration": {
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
            }
        )
    except json.JSONDecodeError:
        return JsonResponse(
            {"success": False, "detail": "Неверный формат данных"},
            status=400,
        )
    except Exception:
        logger.exception("Failed to appoint administrator")
        return JsonResponse(
            {"success": False, "detail": "Внутренняя ошибка сервера"},
            status=500,
        )


@require_http_methods(["POST"])
def remove_administrator(request):
    """Снятие администратора с должности."""
    current_user, error_response = _get_admin_user(request)
    if error_response:
        return error_response

    try:
        data = json.loads(request.body)
        target_student_code = data.get("student_code")

        if not target_student_code:
            return JsonResponse(
                {"success": False, "detail": "Не указан код студента"},
                status=400,
            )

        try:
            target_user = User.objects.get(student_code=target_student_code)
        except User.DoesNotExist:
            return JsonResponse(
                {"success": False, "detail": "Пользователь не найден"},
                status=404,
            )

        try:
            admin_record = Administration.objects.get(
                administrator=target_user,
                is_active=True,
            )
        except Administration.DoesNotExist:
            return JsonResponse(
                {
                    "success": False,
                    "detail": "Пользователь не является администратором",
                },
                status=400,
            )

        admin_record.is_active = False
        admin_record.save(update_fields=["is_active"])

        return JsonResponse(
            {
                "success": True,
                "message": (
                    f"Пользователь {target_user.fullname} снят с должности "
                    "администратора"
                ),
            }
        )
    except json.JSONDecodeError:
        return JsonResponse(
            {"success": False, "detail": "Неверный формат данных"},
            status=400,
        )
    except Exception:
        logger.exception("Failed to remove administrator")
        return JsonResponse(
            {"success": False, "detail": "Внутренняя ошибка сервера"},
            status=500,
        )


@require_http_methods(["GET"])
def get_administrators(request):
    """Получение списка активных администраторов."""
    _, error_response = _get_admin_user(request)
    if error_response:
        return error_response

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

        admin_student_codes = [
            record.administrator.student_code
            for record in page_obj.object_list
        ]
        ban_statuses = BanService.get_ban_statuses(admin_student_codes)

        administrators = []
        for record in page_obj.object_list:
            ban_status = ban_statuses.get(
                record.administrator.student_code,
                {"is_banned": False},
            )
            administrators.append(
                {
                    "id": record.id,
                    "administrator": {
                        "id": record.administrator.id,
                        "student_code": record.administrator.student_code,
                        "fullname": record.administrator.fullname,
                        "faculty": record.administrator.faculty,
                        "created_at": record.administrator.created_at,
                        "last_login": record.administrator.last_login,
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

        return JsonResponse(
            {
                "success": True,
                "administrators": administrators,
                "pagination": {
                    "current_page": page_obj.number,
                    "total_pages": paginator.num_pages,
                    "total_items": paginator.count,
                    "per_page": per_page,
                    "has_next": page_obj.has_next(),
                    "has_previous": page_obj.has_previous(),
                },
            }
        )
    except Exception:
        logger.exception("Failed to fetch administrators")
        return JsonResponse(
            {"success": False, "detail": "Внутренняя ошибка сервера"},
            status=500,
        )


@require_http_methods(["GET"])
def get_administration_history(request):
    """Получение истории назначений администраторов."""
    _, error_response = _get_admin_user(request)
    if error_response:
        return error_response

    try:
        target_student_code = request.GET.get("student_code")

        if target_student_code:
            try:
                target_user = User.objects.get(student_code=target_student_code)
            except User.DoesNotExist:
                return JsonResponse(
                    {"success": False, "detail": "Пользователь не найден"},
                    status=404,
                )

            records = (
                Administration.objects.filter(administrator=target_user)
                .select_related("administrator", "appointed_by")
                .order_by("-appointed_at")
            )
        else:
            records = (
                Administration.objects.all()
                .select_related("administrator", "appointed_by")
                .order_by("-appointed_at")
            )

        history = [
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
            for record in records
        ]

        return JsonResponse(
            {
                "success": True,
                "history": history,
                "total": len(history),
            }
        )
    except Exception:
        logger.exception("Failed to fetch administration history")
        return JsonResponse(
            {"success": False, "detail": "Внутренняя ошибка сервера"},
            status=500,
        )
