from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from typing import Iterable

from asgiref.sync import sync_to_async

from api.content.schedule.views import (
    WEEKDAY_NAMES,
    find_next_lesson_for_group,
    get_moscow_now,
    get_week_value_for_date,
)
from api.core.services import AuthService, UserService
from api.func import authorize
from api.models import LiteratureItem, ScheduleEntry, User
from api.notification_service import NotificationService
from api.referral_service import ReferralService
from api.telegram_binding_service import telegram_binding_service


@dataclass(slots=True)
class BoundUser:
    user_id: int
    fullname: str
    faculty: str
    student_code: str
    telegram_display: str | None

    @property
    def group_number(self) -> str:
        return self.student_code[:8]


@dataclass(slots=True)
class BotAuthResult:
    success: bool
    message: str
    user: BoundUser | None = None
    created: bool = False


async def get_bound_user(telegram_id: int) -> BoundUser | None:
    user = await telegram_binding_service.get_user_by_telegram_id_async(telegram_id)
    if not user:
        return None

    binding = await telegram_binding_service.get_user_binding_async(user)
    telegram_display = None
    if binding:
        telegram_display = f"@{binding.telegram_username}" if binding.telegram_username else str(binding.telegram_id)

    return BoundUser(
        user_id=user.id,
        fullname=user.fullname,
        faculty=user.faculty,
        student_code=user.student_code,
        telegram_display=telegram_display,
    )


def _build_bound_user(user: User, telegram_display: str | None) -> BoundUser:
    return BoundUser(
        user_id=user.id,
        fullname=user.fullname,
        faculty=user.faculty,
        student_code=user.student_code,
        telegram_display=telegram_display,
    )


async def authenticate_or_register_telegram_user(
    telegram_data: dict,
    *,
    student_code: str,
    password: str,
    referral_code: str | None = None,
) -> BotAuthResult:
    existing_bound_user = await telegram_binding_service.get_user_by_telegram_id_async(int(telegram_data["id"]))
    if existing_bound_user:
        if existing_bound_user.student_code != student_code:
            return BotAuthResult(
                success=False,
                message="Этот Telegram уже привязан к другому аккаунту Бентум.",
            )

        binding = await telegram_binding_service.get_user_binding_async(existing_bound_user)
        telegram_display = None
        if binding:
            telegram_display = f"@{binding.telegram_username}" if binding.telegram_username else str(binding.telegram_id)

        return BotAuthResult(
            success=True,
            message="Этот Telegram уже привязан к вашему аккаунту Бентум. Повторная привязка не требуется.",
            user=_build_bound_user(existing_bound_user, telegram_display),
            created=False,
        )

    user = await sync_to_async(UserService.get_user_by_code)(student_code)
    created = False
    referral_result = None

    if user:
        password_ok = await sync_to_async(AuthService.verify_user_password)(user, password)
        if not password_ok:
            return BotAuthResult(
                success=False,
                message="Не удалось войти. Проверьте номер студенческого и пароль.",
            )
        await sync_to_async(AuthService.touch_last_login)(user)
    else:
        auth_result = await sync_to_async(authorize)(student_code, password)
        if auth_result is False:
            return BotAuthResult(
                success=False,
                message="Не удалось подтвердить данные в системе БНТУ. Проверьте номер студенческого и пароль.",
            )

        fullname, faculty = auth_result
        user = await sync_to_async(AuthService.register_user)(student_code, password, fullname, faculty)
        created = True
        referral_result = await sync_to_async(ReferralService.apply_referral)(user, referral_code, source="telegram_bot")

    bind_ok, bind_message = await telegram_binding_service.bind_user_to_telegram_account_async(user, telegram_data)
    if not bind_ok:
        return BotAuthResult(success=False, message=bind_message)

    await sync_to_async(NotificationService.create)(
        user,
        notification_type="login_success",
        title="Новый вход через Telegram-бота",
        body="Вы успешно вошли в Бентум через Telegram-бота.",
        metadata={"source": "telegram_bot"},
    )

    binding = await telegram_binding_service.get_user_binding_async(user)
    telegram_display = None
    if binding:
        telegram_display = f"@{binding.telegram_username}" if binding.telegram_username else str(binding.telegram_id)

    message_parts = [
        (
            "Создали новый аккаунт Бентум и сразу привязали к нему Telegram."
            if created
            else "Нашли существующий аккаунт Бентум и привязали к нему Telegram."
        )
    ]
    if referral_result and referral_result.message:
        message_parts.append(referral_result.message)

    return BotAuthResult(
        success=True,
        message="\n".join(message_parts),
        user=_build_bound_user(user, telegram_display),
        created=created,
    )


@sync_to_async
def get_user_referral_summary(user_id: int, *, site_url: str, bot_username: str | None = None) -> dict | None:
    user = User.objects.filter(id=user_id).first()
    if not user:
        return None
    return ReferralService.get_referral_summary(user, site_url=site_url, bot_username=bot_username)


def _format_lesson_lines(entries: Iterable[ScheduleEntry]) -> str:
    lines: list[str] = []
    for entry in entries:
        teacher = f"\n{entry.teacher}" if entry.teacher else ""
        location_parts: list[str] = []
        if entry.frame:
            location_parts.append(f"корп. {entry.frame}")
        if entry.classroom:
            location_parts.append(f"ауд. {entry.classroom}")
        location = ", ".join(location_parts) if location_parts else "место не указано"
        lines.append(f"<blockquote>{entry.time} | {entry.matter}\n{location}{teacher}</blockquote>")
    return "\n".join(lines) if lines else "Занятий нет"


@sync_to_async
def get_schedule_for_day(group_number: str, *, day_offset: int = 0) -> tuple[str, str]:
    target_date = get_moscow_now().date() + timedelta(days=day_offset)
    weekday_name = WEEKDAY_NAMES[target_date.weekday()]
    week_value = get_week_value_for_date(target_date)
    entries = list(
        ScheduleEntry.objects.filter(group_number=group_number, day=weekday_name, week=week_value).order_by("time")
    )
    return weekday_name, _format_lesson_lines(entries)


@sync_to_async
def get_schedule_for_weekday(group_number: str, *, week_offset: int, weekday_index: int) -> tuple[str, str]:
    now_date = get_moscow_now().date()
    current_weekday = now_date.weekday()
    target_date = now_date + timedelta(days=(weekday_index - current_weekday), weeks=week_offset)
    weekday_name = WEEKDAY_NAMES[weekday_index]
    week_value = get_week_value_for_date(target_date)
    entries = list(
        ScheduleEntry.objects.filter(group_number=group_number, day=weekday_name, week=week_value).order_by("time")
    )
    return weekday_name, _format_lesson_lines(entries)


@sync_to_async
def get_next_lesson_text(group_number: str) -> str | None:
    lesson = find_next_lesson_for_group(group_number)
    if not lesson:
        return None

    teacher = f"\nПреподаватель: {lesson['teacher']}" if lesson.get("teacher") else ""
    location = lesson.get("location_text") or "место не указано"
    day_prefix = "Сегодня" if lesson.get("is_today") else lesson["day"]
    return (
        f"<b>{day_prefix}</b>\n"
        f"<blockquote>{lesson['time']} | {lesson['subject']}\n"
        f"{location}{teacher}</blockquote>"
    )


@sync_to_async
def search_literature(query: str, limit: int = 10) -> list[LiteratureItem]:
    queryset = LiteratureItem.objects.all()
    if query.strip():
        query = query.strip()
        queryset = queryset.filter(title__icontains=query) | LiteratureItem.objects.filter(
            authors__icontains=query
        ) | LiteratureItem.objects.filter(description__icontains=query) | LiteratureItem.objects.filter(
            category__icontains=query
        )
    return list(queryset.order_by("-updated_at", "-id")[:limit])
