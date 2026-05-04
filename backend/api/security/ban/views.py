from datetime import datetime

from django.http import JsonResponse
from rest_framework.decorators import api_view

from ...ban_service import BanService
from ...common.utils import get_current_user, is_request_authenticated
from ...models import User


def _format_end_date(end_date_iso):
    if not end_date_iso:
        return "Навсегда"

    end_date = datetime.fromisoformat(end_date_iso.replace("Z", "+00:00"))
    return (
        end_date.strftime("%d %B %Y года")
        .replace("January", "января")
        .replace("February", "февраля")
        .replace("March", "марта")
        .replace("April", "апреля")
        .replace("May", "мая")
        .replace("June", "июня")
        .replace("July", "июля")
        .replace("August", "августа")
        .replace("September", "сентября")
        .replace("October", "октября")
        .replace("November", "ноября")
        .replace("December", "декабря")
    )


def _format_remaining_time(remaining_seconds):
    if remaining_seconds is None:
        return "Навсегда"

    days = remaining_seconds // (24 * 60 * 60)
    hours = (remaining_seconds % (24 * 60 * 60)) // (60 * 60)
    minutes = (remaining_seconds % (60 * 60)) // 60

    parts = []
    if days > 0:
        parts.append(f"{days} дн.")
    if hours > 0:
        parts.append(f"{hours} ч.")
    if minutes > 0:
        parts.append(f"{minutes} мин.")
    return " ".join(parts)


def _format_duration(duration_seconds):
    if duration_seconds == BanService.FOREVER_DURATION_SECONDS:
        return None, "Навсегда"

    duration_days = duration_seconds // (24 * 60 * 60)
    if duration_days == 1:
        return duration_days, "1 день"
    if duration_days < 7:
        return duration_days, f"{duration_days} дня"
    if duration_days == 7:
        return duration_days, "7 дней"
    if duration_days < 365:
        return duration_days, f"{duration_days} дней"
    if duration_days == 365:
        return duration_days, "1 год"
    return duration_days, f"{duration_days // 365} года"


@api_view(["GET"])
def get_ban_info(request):
    """Получить информацию о бане текущего пользователя."""
    try:
        if not is_request_authenticated(request):
            return JsonResponse({"detail": "Требуется авторизация"}, status=401)

        user = get_current_user(request)
        student_code = user.student_code if user else None
        if not student_code or len(student_code) != 10 or not student_code.isdigit():
            return JsonResponse({"detail": "Некорректный код студента"}, status=400)

        try:
            User.objects.get(student_code=student_code)
        except User.DoesNotExist:
            return JsonResponse({"detail": "Пользователь не найден"}, status=404)

        ban_status = BanService.check_ban_status(student_code)
        if not ban_status["is_banned"]:
            return JsonResponse(
                {
                    "success": False,
                    "detail": "Пользователь не забанен",
                },
                status=200,
            )

        ban_info = ban_status["ban_info"]
        duration_days, duration_text = _format_duration(ban_info["ban_duration_seconds"])

        return JsonResponse(
            {
                "success": True,
                "ban_info": {
                    "reason": ban_info["ban_reason"],
                    "duration_days": duration_days,
                    "duration_text": duration_text,
                    "end_date": ban_info["ban_end_date"],
                    "end_date_formatted": _format_end_date(ban_info["ban_end_date"]),
                    "remaining_seconds": ban_info["remaining_seconds"],
                    "remaining_time_text": _format_remaining_time(ban_info["remaining_seconds"]),
                    "banned_by_id": ban_info["banned_by_id"],
                    "ban_date": ban_info["ban_date"],
                },
            }
        )
    except Exception as exc:
        return JsonResponse(
            {
                "success": False,
                "detail": f"Ошибка: {exc}",
            },
            status=500,
        )
