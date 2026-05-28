from __future__ import annotations

import os
from dataclasses import dataclass


CANONICAL_WEB_APP_URL = "https://bentum.ru"


@dataclass(slots=True)
class BotConfig:
    token: str
    web_app_url: str
    site_url: str
    bot_username: str | None
    map_image: str | None
    schedule_image: str | None
    profile_image: str | None
    support_image: str | None
    main_image: str | None
    example_image: str | None
    mailing_image: str | None
    studsovet_image: str | None
    support_username: str | None
    support_link: str

    @classmethod
    def from_env(cls) -> "BotConfig":
        support_username = (os.environ.get("USER_OWNER") or "").strip().lstrip("@") or None
        return cls(
            token=os.environ.get("TELEGRAM_BOT_TOKEN", "").strip(),
            web_app_url=CANONICAL_WEB_APP_URL,
            site_url=CANONICAL_WEB_APP_URL,
            bot_username=(os.environ.get("TELEGRAM_BOT_USERNAME", "").strip().lstrip("@") or None),
            map_image=os.environ.get("MAP_IMAGE") or None,
            schedule_image=os.environ.get("SCHEDULE_IMAGE") or None,
            profile_image=os.environ.get("PROFILE_IMAGE") or None,
            support_image=os.environ.get("SUPPORT_IMAGE") or None,
            main_image=os.environ.get("MAIN_IMAGE") or None,
            example_image=os.environ.get("EXAMPLE_IMAGE") or None,
            mailing_image=os.environ.get("MAILING_IMAGE") or None,
            studsovet_image=os.environ.get("STUDSOVET_IMAGE") or None,
            support_username=support_username,
            support_link=CANONICAL_WEB_APP_URL,
        )
