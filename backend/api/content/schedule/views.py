"""Views for schedule content."""

from datetime import date, timedelta
from zoneinfo import ZoneInfo

from django.db.models import Max
from django.http import JsonResponse
from django.utils import timezone

from ...common.utils import get_current_user, is_request_authenticated
from ...models import ScheduleEntry

MOSCOW_TZ = ZoneInfo("Europe/Moscow")
ACADEMIC_START_DATE = date(2025, 9, 1)
WEEKDAY_NAMES = {
    0: "Понедельник",
    1: "Вторник",
    2: "Среда",
    3: "Четверг",
    4: "Пятница",
    5: "Суббота",
    6: "Воскресенье",
}


def get_moscow_now():
    return timezone.localtime(timezone.now(), MOSCOW_TZ)


def get_week_value_for_date(target_date):
    diff_days = (target_date - ACADEMIC_START_DATE).days
    diff_weeks = diff_days // 7
    return 0 if diff_weeks % 2 == 0 else 1


def serialize_schedule_rows(rows, student_code, updated_at=None):
    schedule_data = {}
    for day, week, time, matter, frame, teacher, classroom in rows:
        schedule_data.setdefault(day, {})
        week_type = "upper" if week == 1 else "lower"
        schedule_data[day].setdefault(week_type, [])
        schedule_data[day][week_type].append(
            {
                "time": time,
                "subject": matter,
                "type": frame,
                "teacher": teacher,
                "classroom": classroom,
            }
        )

    return {
        "success": True,
        "schedule": schedule_data,
        "student_code": student_code,
        "schedule_updated_at": updated_at.isoformat() if updated_at else None,
    }


def parse_time_range(time_range):
    start, _, end = str(time_range or "").partition(" - ")
    start_hour, start_minute = [int(part) for part in start.split(":")]
    if end:
        end_hour, end_minute = [int(part) for part in end.split(":")]
    else:
        total_end_minutes = start_hour * 60 + start_minute + 95
        end_hour = total_end_minutes // 60
        end_minute = total_end_minutes % 60

    return {
        "start": start,
        "end": end or f"{end_hour:02d}:{end_minute:02d}",
        "start_minutes": start_hour * 60 + start_minute,
        "end_minutes": end_hour * 60 + end_minute,
    }


def build_location_text(entry):
    parts = []
    if entry.frame:
        parts.append(f"Корпус {entry.frame}")
    if entry.classroom:
        parts.append(f"ауд. {entry.classroom}")
    return ", ".join(parts)


def find_next_lesson_for_group(group_id):
    current_moscow = get_moscow_now()
    current_minutes = current_moscow.hour * 60 + current_moscow.minute

    for day_offset in range(14):
        target_date = current_moscow.date() + timedelta(days=day_offset)
        weekday_name = WEEKDAY_NAMES[target_date.weekday()]
        week_value = get_week_value_for_date(target_date)

        lessons = list(
            ScheduleEntry.objects.filter(group_number=group_id, day=weekday_name, week=week_value)
            .order_by("time")
        )

        if not lessons:
            continue

        for lesson in lessons:
            parsed_time = parse_time_range(lesson.time)
            if day_offset == 0 and parsed_time["end_minutes"] <= current_minutes:
                continue

            return {
                "day": lesson.day,
                "week_type": "upper" if lesson.week == 1 else "lower",
                "time": lesson.time,
                "time_start": parsed_time["start"],
                "time_end": parsed_time["end"],
                "subject": lesson.matter,
                "teacher": lesson.teacher,
                "frame": lesson.frame,
                "classroom": lesson.classroom,
                "location_text": build_location_text(lesson),
                "is_today": day_offset == 0,
            }

    return None


def get_schedule(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Метод не разрешён"}, status=405)

    if not is_request_authenticated(request):
        return JsonResponse({"detail": "Требуется авторизация"}, status=401)

    user = get_current_user(request)
    if user is None:
        return JsonResponse({"detail": "Отсутствует код студента"}, status=400)

    student_code = user.student_code
    group_id = student_code[:8]
    queryset = ScheduleEntry.objects.filter(group_number=group_id)
    rows = list(
        queryset
        .order_by("day", "week", "time")
        .values_list("day", "week", "time", "matter", "frame", "teacher", "classroom")
    )

    if not rows:
        return JsonResponse({"detail": f"Расписание для группы {group_id} не найдено"}, status=404)

    latest_updated_at = queryset.aggregate(last_updated_at=Max("updated_at"))["last_updated_at"]
    return JsonResponse(serialize_schedule_rows(rows, student_code, latest_updated_at), status=200)


def get_next_schedule_lesson(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Метод не разрешён"}, status=405)

    if not is_request_authenticated(request):
        return JsonResponse({"detail": "Требуется авторизация"}, status=401)

    user = get_current_user(request)
    if user is None:
        return JsonResponse({"detail": "Отсутствует код студента"}, status=400)

    student_code = user.student_code
    group_id = student_code[:8]
    next_lesson = find_next_lesson_for_group(group_id)

    if not next_lesson:
        return JsonResponse(
            {
                "success": False,
                "detail": f"Следующая пара для группы {group_id} не найдена",
            },
            status=404,
        )

    return JsonResponse(
        {
            "success": True,
            "student_code": student_code,
            "next_lesson": next_lesson,
        },
        status=200,
    )
