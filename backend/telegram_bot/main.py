from __future__ import annotations

import asyncio
import hashlib
import logging
import os
from typing import Optional

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", os.environ.get("DJANGO_SETTINGS_MODULE", "backend.settings"))
django.setup()

from aiogram import Bot, Dispatcher, F
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (
    CallbackQuery,
    InlineQuery,
    InlineQueryResultArticle,
    InputMediaPhoto,
    InputTextMessageContent,
    Message,
)

from api.telegram_binding_service import telegram_binding_service

from . import keyboards
from .config import BotConfig
from .services import (
    authenticate_or_register_telegram_user,
    get_bound_user,
    get_next_lesson_text,
    get_schedule_for_day,
    get_schedule_for_weekday,
    get_user_referral_summary,
    search_literature,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


class BotAuthStates(StatesGroup):
    student_code = State()
    password = State()


config = BotConfig.from_env()
dp = Dispatcher()


def _safe_result_id(seed: str) -> str:
    return hashlib.sha256(seed.encode("utf-8")).hexdigest()[:32]


def _extract_referral_code_from_payload(payload: str | None) -> str | None:
    if not payload:
        return None
    payload = payload.strip()
    if not payload.lower().startswith("ref_"):
        return None
    referral_code = payload[4:].strip().upper()
    return referral_code or None


async def _refresh_telegram_binding_metadata(from_user) -> None:
    if not from_user:
        return
    await telegram_binding_service.refresh_binding_metadata_async(
        {
            "id": from_user.id,
            "username": from_user.username,
            "first_name": from_user.first_name,
            "last_name": from_user.last_name,
        }
    )


async def _send_photo_or_text(
    target: Message,
    *,
    text: str,
    markup,
    photo: str | None = None,
):
    if photo:
        await target.answer_photo(photo, caption=text, reply_markup=markup)
        return
    await target.answer(text, reply_markup=markup)


async def _show_callback_content(
    callback: CallbackQuery,
    *,
    text: str,
    markup,
    photo: str | None = None,
):
    message = callback.message
    if not message:
        await callback.answer()
        return

    if photo:
        if message.photo:
            await message.edit_media(
                media=InputMediaPhoto(media=photo, caption=text, parse_mode=ParseMode.HTML),
                reply_markup=markup,
            )
        else:
            await message.answer_photo(photo, caption=text, reply_markup=markup)
            await message.delete()
    else:
        if message.photo:
            await message.answer(text, reply_markup=markup)
            await message.delete()
        else:
            await message.edit_text(text, reply_markup=markup)
    await callback.answer()


def _main_menu_text(first_name: str | None) -> str:
    greeting_name = first_name or "друг"
    return (
        f"Привет, {greeting_name}!\n\n"
        "Это объединённый бот Bentum. Здесь можно открыть сайт, посмотреть своё расписание, "
        "поискать литературу, открыть карту БНТУ и работать с реферальной системой."
    )


def _profile_text(user) -> str:
    lines = [
        f"<b>{user.fullname}</b>",
        f"Группа: {user.group_number}",
        f"Факультет: {user.faculty}",
    ]
    if user.telegram_display:
        lines.append(f"Telegram: {user.telegram_display}")
    return "\n".join(lines)


def _referral_text(summary: dict) -> str:
    lines = [
        "<b>Реферальная система Bentum</b>",
        "",
        f"Ваш код: <code>{summary['code']}</code>",
        f"Приглашено пользователей: {summary['invited_count']}",
    ]

    referred_by = summary.get("referred_by")
    if referred_by:
        lines.extend(
            [
                "",
                f"Вас пригласил: <b>{referred_by.get('fullname') or 'Пользователь Bentum'}</b>",
                f"Код студента: {referred_by.get('student_code') or 'не указан'}",
            ]
        )

    lines.extend(
        [
            "",
            "Ссылки для приглашения:",
            summary["site_link"],
        ]
    )

    telegram_link = summary.get("telegram_link")
    if telegram_link:
        lines.append(telegram_link)

    return "\n".join(lines)


async def _send_main_menu(target: Message, text: Optional[str] = None):
    await _refresh_telegram_binding_metadata(target.from_user)
    bound_user = await get_bound_user(target.from_user.id) if target.from_user else None
    await _send_photo_or_text(
        target,
        text=text or _main_menu_text(target.from_user.first_name if target.from_user else None),
        markup=keyboards.main_menu(config.web_app_url) if bound_user else keyboards.guest_main_menu(config.web_app_url),
        photo=config.main_image,
    )


async def _ensure_bound(target: Message | CallbackQuery):
    from_user = target.from_user
    await _refresh_telegram_binding_metadata(from_user)
    user = await get_bound_user(from_user.id)
    if user:
        return from_user.id, user

    text = (
        "Этот раздел доступен только после авторизации в боте.\n\n"
        "Нажмите «Авторизоваться в боте» и введите номер студенческого билета и пароль, "
        "или сначала привяжите Telegram в настройках Bentum на сайте."
    )
    markup = keyboards.unbound_profile(config.web_app_url)

    if isinstance(target, Message):
        await _send_photo_or_text(target, text=text, markup=markup, photo=config.profile_image)
    else:
        await _show_callback_content(target, text=text, markup=markup, photo=config.profile_image)
    return None


async def _start_bot_auth(target: Message | CallbackQuery, state: FSMContext):
    if target.from_user:
        bound_user = await get_bound_user(target.from_user.id)
        if bound_user:
            text = (
                f"Telegram уже привязан к аккаунту <b>{bound_user.fullname}</b>.\n\n"
                "Если нужно перепривязать аккаунт, сначала отвяжите Telegram в настройках Bentum."
            )
            if isinstance(target, Message):
                await target.answer(text)
            else:
                await target.answer("Telegram уже привязан.", show_alert=True)
                if target.message:
                    await target.message.answer(text)
            return

    preserved_data = await state.get_data()
    referral_code = preserved_data.get("referral_code")
    await state.clear()
    if referral_code:
        await state.update_data(referral_code=referral_code)

    await state.set_state(BotAuthStates.student_code)
    prompt = (
        "Отправьте номер студенческого билета без пробелов и лишних символов.\n\n"
        "Пример: <code>1090352523</code>"
    )
    if isinstance(target, Message):
        await target.answer(prompt, reply_markup=keyboards.auth_cancel())
    else:
        await target.answer()
        if target.message:
            await target.message.answer(prompt, reply_markup=keyboards.auth_cancel())


@dp.message(CommandStart())
async def handle_start(message: Message, state: FSMContext):
    payload: Optional[str] = None
    parts = (message.text or "").split(maxsplit=1)
    if len(parts) == 2:
        payload = parts[1].strip()

    referral_code = _extract_referral_code_from_payload(payload)
    if referral_code:
        bound_user = await get_bound_user(message.from_user.id)
        if bound_user:
            await message.answer(
                "Ваш аккаунт уже существует, поэтому реферальный код не применяется повторно."
            )
            await _send_main_menu(message)
            return

        await state.clear()
        await state.update_data(referral_code=referral_code)
        await message.answer(
            f"Реферальный код <code>{referral_code}</code> сохранён.\n"
            "Теперь авторизуйтесь в боте, и мы привяжем его к вашему новому аккаунту Bentum."
        )
        await _start_bot_auth(message, state)
        return

    if payload:
        ok, result_message = await telegram_binding_service.bind_telegram_account(
            payload,
            {
                "id": message.from_user.id,
                "username": message.from_user.username,
                "first_name": message.from_user.first_name,
                "last_name": message.from_user.last_name,
            },
        )
        if ok:
            await message.answer(f"Telegram успешно привязан.\n\n{result_message}")
        else:
            await message.answer(f"Не удалось привязать Telegram.\n\n{result_message}")
        return

    await _send_main_menu(message)


@dp.message(Command("menu"))
async def handle_menu(message: Message):
    await _send_main_menu(message)


@dp.message(Command("login"))
async def handle_login_command(message: Message, state: FSMContext):
    await _start_bot_auth(message, state)


@dp.message(Command("profile"))
async def handle_profile_command(message: Message):
    bound = await _ensure_bound(message)
    if not bound:
        return
    _, user = bound
    await _send_photo_or_text(
        message,
        text=_profile_text(user),
        markup=keyboards.profile_menu(),
        photo=config.profile_image,
    )


@dp.callback_query(F.data == "auth")
async def handle_auth_callback(callback: CallbackQuery, state: FSMContext):
    await _start_bot_auth(callback, state)


@dp.message(BotAuthStates.student_code)
async def handle_auth_student_code(message: Message, state: FSMContext):
    student_code = (message.text or "").strip()
    if not student_code.isdigit() or len(student_code) != 10:
        await message.answer(
            "Нужен номер студенческого из 10 цифр. Попробуйте ещё раз.",
            reply_markup=keyboards.auth_cancel(),
        )
        return

    await state.update_data(student_code=student_code)
    await state.set_state(BotAuthStates.password)
    await message.answer(
        "Теперь отправьте пароль от аккаунта БНТУ или Bentum.\n\n"
        "Для сценария старого BntuBot это тот же «красный номер» со студенческого.",
        reply_markup=keyboards.auth_cancel(),
    )


@dp.message(BotAuthStates.password)
async def handle_auth_password(message: Message, state: FSMContext):
    password = (message.text or "").strip()
    if not password:
        await message.answer("Пароль не должен быть пустым.", reply_markup=keyboards.auth_cancel())
        return

    data = await state.get_data()
    await state.clear()

    result = await authenticate_or_register_telegram_user(
        {
            "id": message.from_user.id,
            "username": message.from_user.username,
            "first_name": message.from_user.first_name,
            "last_name": message.from_user.last_name,
        },
        student_code=data["student_code"],
        password=password,
        referral_code=data.get("referral_code"),
    )

    if not result.success:
        await message.answer(
            f"{result.message}\n\nПопробуйте снова командой /login или кнопкой «Авторизоваться в боте».",
            reply_markup=keyboards.back_to_main(),
        )
        return

    success_text = (
        f"Готово, <b>{result.user.fullname}</b>!\n\n"
        f"{result.message}\n"
        f"Группа: {result.user.group_number}\n"
        f"Факультет: {result.user.faculty}"
    )
    await message.answer(success_text)
    await _send_main_menu(message, text="Вы авторизованы в Bentum. Выберите нужный раздел.")


@dp.callback_query(F.data == "main_menu")
async def handle_main_menu(callback: CallbackQuery, state: FSMContext):
    await state.clear()
    bound_user = await get_bound_user(callback.from_user.id) if callback.from_user else None
    await _show_callback_content(
        callback,
        text=_main_menu_text(callback.from_user.first_name if callback.from_user else None),
        markup=keyboards.main_menu(config.web_app_url) if bound_user else keyboards.guest_main_menu(config.web_app_url),
        photo=config.main_image,
    )


@dp.callback_query(F.data == "profile")
async def handle_profile(callback: CallbackQuery):
    bound = await _ensure_bound(callback)
    if not bound:
        return
    _, user = bound
    await _show_callback_content(
        callback,
        text=_profile_text(user),
        markup=keyboards.profile_menu(),
        photo=config.profile_image,
    )


@dp.callback_query(F.data == "referral")
async def handle_referral(callback: CallbackQuery):
    bound = await _ensure_bound(callback)
    if not bound:
        return
    _, user = bound
    summary = await get_user_referral_summary(
        user.user_id,
        site_url=config.site_url,
        bot_username=config.bot_username,
    )
    await _show_callback_content(
        callback,
        text=_referral_text(summary),
        markup=keyboards.referral_menu(),
        photo=config.profile_image or config.main_image,
    )


@dp.callback_query(F.data == "schedule")
async def handle_schedule(callback: CallbackQuery):
    bound = await _ensure_bound(callback)
    if not bound:
        return
    await _show_callback_content(
        callback,
        text="Выберите нужный раздел расписания.",
        markup=keyboards.schedule_menu(),
        photo=config.schedule_image,
    )


@dp.callback_query(F.data.in_({"schedule:today", "schedule:tomorrow"}))
async def handle_schedule_day(callback: CallbackQuery):
    bound = await _ensure_bound(callback)
    if not bound:
        return
    _, user = bound
    day_offset = 1 if callback.data == "schedule:tomorrow" else 0
    day_name, schedule_text = await get_schedule_for_day(user.group_number, day_offset=day_offset)
    await _show_callback_content(
        callback,
        text=f"<b>{day_name}</b>\n{schedule_text}",
        markup=keyboards.schedule_menu(),
        photo=config.schedule_image,
    )


@dp.callback_query(F.data == "schedule:next")
async def handle_schedule_next(callback: CallbackQuery):
    bound = await _ensure_bound(callback)
    if not bound:
        return
    _, user = bound
    next_lesson_text = await get_next_lesson_text(user.group_number)
    await _show_callback_content(
        callback,
        text=next_lesson_text or "Ближайшая пара не найдена.",
        markup=keyboards.schedule_menu(),
        photo=config.schedule_image,
    )


@dp.callback_query(F.data.startswith("schedule_week:"))
async def handle_schedule_week(callback: CallbackQuery):
    bound = await _ensure_bound(callback)
    if not bound:
        return
    week_offset = int(callback.data.split(":")[1])
    title = "Выберите день следующей недели." if week_offset else "Выберите день этой недели."
    await _show_callback_content(
        callback,
        text=title,
        markup=keyboards.schedule_week_menu(week_offset),
        photo=config.schedule_image,
    )


@dp.callback_query(F.data.startswith("schedule_day:"))
async def handle_schedule_weekday(callback: CallbackQuery):
    bound = await _ensure_bound(callback)
    if not bound:
        return
    _, user = bound
    _, week_offset, weekday_index = callback.data.split(":")
    day_name, schedule_text = await get_schedule_for_weekday(
        user.group_number,
        week_offset=int(week_offset),
        weekday_index=int(weekday_index),
    )
    await _show_callback_content(
        callback,
        text=f"<b>{day_name}</b>\n{schedule_text}",
        markup=keyboards.schedule_week_menu(int(week_offset)),
        photo=config.schedule_image,
    )


@dp.callback_query(F.data == "map")
async def handle_map(callback: CallbackQuery):
    bound = await _ensure_bound(callback)
    if not bound:
        return
    await _show_callback_content(
        callback,
        text="Карта мини-городка БНТУ.",
        markup=keyboards.back_to_main(),
        photo=config.map_image,
    )


@dp.callback_query(F.data == "help")
async def handle_help(callback: CallbackQuery):
    bound = await _ensure_bound(callback)
    if not bound:
        return
    username_part = f" или @{config.support_username}" if config.support_username else ""
    text = (
        "Поддержка Bentum доступна на сайте.\n\n"
        f"Откройте раздел поддержки в приложении{username_part}."
    )
    await _show_callback_content(
        callback,
        text=text,
        markup=keyboards.support_menu(config.support_link),
        photo=config.support_image,
    )


@dp.inline_query()
async def handle_inline_literature(inline_query: InlineQuery):
    await _refresh_telegram_binding_metadata(inline_query.from_user)
    bound_user = await get_bound_user(inline_query.from_user.id) if inline_query.from_user else None
    if not bound_user:
        await inline_query.answer(
            results=[
                InlineQueryResultArticle(
                    id=_safe_result_id("auth-required"),
                    title="Сначала авторизуйтесь в боте",
                    description="Литература доступна после привязки Telegram к аккаунту Bentum.",
                    input_message_content=InputTextMessageContent(
                        message_text=(
                            "Сначала авторизуйтесь в боте через кнопку «Авторизоваться в боте» "
                            "или команду /login, а затем попробуйте поиск литературы снова."
                        ),
                        parse_mode=ParseMode.HTML,
                    ),
                )
            ],
            cache_time=5,
            is_personal=True,
        )
        return

    query = inline_query.query or ""
    items = await search_literature(query, limit=10)
    results: list[InlineQueryResultArticle] = []

    for item in items:
        title = item.title[:256]
        description = (item.authors or item.category or item.faculty or "Литература Bentum")[:256]
        text_lines = [f"<b>{item.title}</b>"]
        if item.authors:
            text_lines.append(f"Авторы: {item.authors}")
        if item.category:
            text_lines.append(f"Категория: {item.category}")
        if item.description:
            text_lines.append("")
            text_lines.append(item.description[:900])
        if item.download_link:
            text_lines.append("")
            text_lines.append(item.download_link)

        results.append(
            InlineQueryResultArticle(
                id=_safe_result_id(f"{item.id}:{item.title}"),
                title=title,
                description=description,
                input_message_content=InputTextMessageContent(
                    message_text="\n".join(text_lines),
                    parse_mode=ParseMode.HTML,
                    disable_web_page_preview=False,
                ),
            )
        )

    await inline_query.answer(results=results, cache_time=30, is_personal=True)


async def main():
    if not config.token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not configured")

    bot = Bot(token=config.token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    me = await bot.get_me()
    if not config.bot_username and me.username:
        config.bot_username = me.username
    logger.info("Unified Bentum bot started: @%s", me.username)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
