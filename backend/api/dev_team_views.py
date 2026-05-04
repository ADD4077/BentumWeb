import logging

from django.http import JsonResponse
from rest_framework.decorators import api_view

from .common.decorators import allow_unverified_2fa
from .models import DevTeamMember

logger = logging.getLogger(__name__)


@allow_unverified_2fa
@api_view(["GET"])
def get_dev_team_members(request):
    """Публичный endpoint для карусели команды на главной странице."""
    try:
        members = (
            DevTeamMember.objects.filter(is_active=True)
            .order_by("display_order", "id")
            .values("id", "fullname", "student_code", "role", "description", "display_order")
        )

        return JsonResponse(
            {
                "success": True,
                "team_members": [
                    {
                        "id": member["id"],
                        "name": member["fullname"],
                        "studentCode": member["student_code"],
                        "role": member["role"],
                        "description": member["description"],
                        "displayOrder": member["display_order"],
                    }
                    for member in members
                ],
            }
        )
    except Exception:
        logger.exception("Failed to fetch dev team members")
        return JsonResponse(
            {"success": False, "detail": "Ошибка загрузки команды"},
            status=500,
        )
