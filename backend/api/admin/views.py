import json
import logging

from django.core.paginator import Paginator
from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from ..activity_service import log_activity_event
from ..ban_service import BanService
from ..common.permissions import can_access_admin_panel
from ..common.utils import get_current_user, is_request_authenticated
from ..models import ActivityEvent, Administration, User

logger = logging.getLogger(__name__)


def _get_current_user(request):
    request_user = getattr(request, "user", None)
    if isinstance(request_user, User) and getattr(request_user, "is_authenticated", False):
        request.session["student_code"] = request_user.student_code
        request.session["fullname"] = request_user.fullname
        request.session["faculty"] = request_user.faculty
        request.session["is_authenticated"] = True
        return request_user

    return get_current_user(request)


def _require_admin_user(request):
    if not is_request_authenticated(request):
        return None, JsonResponse({"success": False, "detail": "РўСЂРµР±СѓРµС‚СЃСЏ Р°РІС‚РѕСЂРёР·Р°С†РёСЏ"}, status=401)

    current_user = _get_current_user(request)
    if current_user is None:
        return None, JsonResponse({"success": False, "detail": "РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ РЅР°Р№РґРµРЅ"}, status=404)

    if not can_access_admin_panel(current_user):
        return None, JsonResponse({"success": False, "detail": "РќРµРґРѕСЃС‚Р°С‚РѕС‡РЅРѕ РїСЂР°РІ"}, status=403)

    return current_user, None


@require_http_methods(["POST"])
def appoint_administrator(request):
    """РќР°Р·РЅР°С‡РµРЅРёРµ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°."""
    try:
        current_user, error_response = _require_admin_user(request)
        if error_response:
            return error_response

        data = json.loads(request.body or "{}")
        target_student_code = data.get("student_code")
        notes = data.get("notes", "")

        if not target_student_code:
            return JsonResponse({"success": False, "detail": "РќРµ СѓРєР°Р·Р°РЅ РєРѕРґ СЃС‚СѓРґРµРЅС‚Р°"}, status=400)

        try:
            target_user = User.objects.get(student_code=target_student_code)
        except User.DoesNotExist:
            return JsonResponse({"success": False, "detail": "РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ РЅР°Р№РґРµРЅ"}, status=404)

        if Administration.objects.filter(administrator=target_user, is_active=True).exists():
            return JsonResponse(
                {"success": False, "detail": "РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ СѓР¶Рµ СЏРІР»СЏРµС‚СЃСЏ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРј"},
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
                "message": f"РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ {target_user.fullname} РЅР°Р·РЅР°С‡РµРЅ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРј",
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
        return JsonResponse({"success": False, "detail": "РќРµРІРµСЂРЅС‹Р№ С„РѕСЂРјР°С‚ РґР°РЅРЅС‹С…"}, status=400)
    except Exception:
        logger.exception("Failed to appoint administrator")
        return JsonResponse({"success": False, "detail": "Р’РЅСѓС‚СЂРµРЅРЅСЏСЏ РѕС€РёР±РєР° СЃРµСЂРІРµСЂР°"}, status=500)


@require_http_methods(["POST"])
def remove_administrator(request):
    """РЎРЅСЏС‚РёРµ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°."""
    try:
        current_user, error_response = _require_admin_user(request)
        if error_response:
            return error_response

        data = json.loads(request.body or "{}")
        target_student_code = data.get("student_code")

        if not target_student_code:
            return JsonResponse({"success": False, "detail": "РќРµ СѓРєР°Р·Р°РЅ РєРѕРґ СЃС‚СѓРґРµРЅС‚Р°"}, status=400)

        try:
            target_user = User.objects.get(student_code=target_student_code)
        except User.DoesNotExist:
            return JsonResponse({"success": False, "detail": "РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ РЅР°Р№РґРµРЅ"}, status=404)

        try:
            admin_record = Administration.objects.get(administrator=target_user, is_active=True)
        except Administration.DoesNotExist:
            return JsonResponse(
                {"success": False, "detail": "РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ СЏРІР»СЏРµС‚СЃСЏ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРј"},
                status=400,
            )

        admin_record.is_active = False
        admin_record.save(update_fields=["is_active"])

        log_activity_event(
            ActivityEvent.EVENT_ADMIN_REMOVED,
            user=target_user,
            actor=current_user,
            details=f"РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ {target_user.fullname} СЃРЅСЏС‚ СЃ РґРѕР»Р¶РЅРѕСЃС‚Рё Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°",
        )

        return JsonResponse(
            {
                "success": True,
                "message": f"РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ {target_user.fullname} СЃРЅСЏС‚ СЃ РґРѕР»Р¶РЅРѕСЃС‚Рё Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°",
            }
        )
    except json.JSONDecodeError:
        return JsonResponse({"success": False, "detail": "РќРµРІРµСЂРЅС‹Р№ С„РѕСЂРјР°С‚ РґР°РЅРЅС‹С…"}, status=400)
    except Exception:
        logger.exception("Failed to remove administrator")
        return JsonResponse({"success": False, "detail": "Р’РЅСѓС‚СЂРµРЅРЅСЏСЏ РѕС€РёР±РєР° СЃРµСЂРІРµСЂР°"}, status=500)


@require_http_methods(["GET"])
def get_administrators(request):
    """РџРѕР»СѓС‡РµРЅРёРµ СЃРїРёСЃРєР° Р°РєС‚РёРІРЅС‹С… Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРІ."""
    _, error_response = _require_admin_user(request)
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

        return JsonResponse(
            {
                "success": True,
                "administrators": administrators,
                "pagination": {
                    "current_page": page_obj.number,
                    "total_pages": paginator.num_pages,
                    "total_items": paginator.count,
                    "has_next": page_obj.has_next(),
                    "has_previous": page_obj.has_previous(),
                },
            }
        )
    except Exception:
        logger.exception("Failed to get administrators")
        return JsonResponse({"success": False, "detail": "Р’РЅСѓС‚СЂРµРЅРЅСЏСЏ РѕС€РёР±РєР° СЃРµСЂРІРµСЂР°"}, status=500)


@require_http_methods(["GET"])
def get_administration_history(request):
    """РџРѕР»СѓС‡РµРЅРёРµ РёСЃС‚РѕСЂРёРё РЅР°Р·РЅР°С‡РµРЅРёР№ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРІ."""
    current_user, error_response = _require_admin_user(request)
    if error_response:
        return error_response
    del current_user

    try:
        target_student_code = request.GET.get("student_code")

        if target_student_code:
            try:
                target_user = User.objects.get(student_code=target_student_code)
            except User.DoesNotExist:
                return JsonResponse({"success": False, "detail": "РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ РЅР°Р№РґРµРЅ"}, status=404)

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

        return JsonResponse(
            {
                "success": True,
                "history": history,
                "total": len(history),
            }
        )
    except Exception:
        logger.exception("Failed to get administration history")
        return JsonResponse({"success": False, "detail": "Р’РЅСѓС‚СЂРµРЅРЅСЏСЏ РѕС€РёР±РєР° СЃРµСЂРІРµСЂР°"}, status=500)
