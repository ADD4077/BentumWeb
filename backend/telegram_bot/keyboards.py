from __future__ import annotations

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo


def main_menu(web_app_url: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Открыть Бентум", web_app=WebAppInfo(url=web_app_url))],
            [
                InlineKeyboardButton(text="Расписание", callback_data="schedule"),
                InlineKeyboardButton(text="Литература", switch_inline_query_current_chat=""),
            ],
            [
                InlineKeyboardButton(text="Карта", callback_data="map"),
                InlineKeyboardButton(text="Профиль", callback_data="profile"),
            ],
            [InlineKeyboardButton(text="Поддержка", callback_data="help")],
        ]
    )


def guest_main_menu(web_app_url: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Открыть Бентум", web_app=WebAppInfo(url=web_app_url))],
            [InlineKeyboardButton(text="Авторизоваться", callback_data="auth")],
        ]
    )


def back_to_main() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[[InlineKeyboardButton(text="Назад", callback_data="main_menu")]]
    )


def profile_menu() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Реферальная система", callback_data="referral")],
            [InlineKeyboardButton(text="Назад", callback_data="main_menu")],
        ]
    )


def referral_menu() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Вернуться в профиль", callback_data="profile")],
            [InlineKeyboardButton(text="В меню", callback_data="main_menu")],
        ]
    )


def unbound_profile(web_app_url: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Открыть Бентум", web_app=WebAppInfo(url=web_app_url))],
            [InlineKeyboardButton(text="Авторизоваться в боте", callback_data="auth")],
            [InlineKeyboardButton(text="Назад", callback_data="main_menu")],
        ]
    )


def support_menu(web_app_url: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Открыть поддержку Бентум", web_app=WebAppInfo(url=web_app_url))],
            [InlineKeyboardButton(text="Назад", callback_data="main_menu")],
        ]
    )


def schedule_menu() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="Сегодня", callback_data="schedule:today"),
                InlineKeyboardButton(text="Завтра", callback_data="schedule:tomorrow"),
            ],
            [InlineKeyboardButton(text="Следующая пара", callback_data="schedule:next")],
            [
                InlineKeyboardButton(text="Эта неделя", callback_data="schedule_week:0"),
                InlineKeyboardButton(text="Следующая неделя", callback_data="schedule_week:1"),
            ],
            [InlineKeyboardButton(text="Назад", callback_data="main_menu")],
        ]
    )


def schedule_week_menu(week_offset: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="Пн", callback_data=f"schedule_day:{week_offset}:0"),
                InlineKeyboardButton(text="Вт", callback_data=f"schedule_day:{week_offset}:1"),
                InlineKeyboardButton(text="Ср", callback_data=f"schedule_day:{week_offset}:2"),
            ],
            [
                InlineKeyboardButton(text="Чт", callback_data=f"schedule_day:{week_offset}:3"),
                InlineKeyboardButton(text="Пт", callback_data=f"schedule_day:{week_offset}:4"),
                InlineKeyboardButton(text="Сб", callback_data=f"schedule_day:{week_offset}:5"),
            ],
            [
                InlineKeyboardButton(text="К расписанию", callback_data="schedule"),
                InlineKeyboardButton(text="В меню", callback_data="main_menu"),
            ],
        ]
    )


def auth_cancel() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[[InlineKeyboardButton(text="Отмена", callback_data="main_menu")]]
    )
