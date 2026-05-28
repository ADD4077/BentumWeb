#!/usr/bin/env python3
"""Backward-compatible entrypoint for the unified Bentum Telegram bot."""

from telegram_bot.main import main


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
