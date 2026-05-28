import asyncio
import aiohttp
import io
import json
import requests
import shutil
import sqlite3
import tempfile
from datetime import datetime, timedelta
from types import SimpleNamespace
from zoneinfo import ZoneInfo
from unittest.mock import patch

from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from django.contrib.sessions.middleware import SessionMiddleware
from django.core.cache import cache
from django.core.management import call_command
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, RequestFactory, TestCase, TransactionTestCase
from django.test.utils import override_settings
from django.utils import timezone
from PIL import Image

from api.background_jobs import BackgroundJobService, BackgroundJobType
from api.ban_service import BanService
from api.content_parser_service import BNTUContentParserService
from api.content.schedule.views import WEEKDAY_NAMES, get_week_value_for_date
from api.core.services import SessionService, get_client_ip
from api.func import authorize
from api.support import views as support_views
from api.models import (
    ActivityEvent,
    Administration,
    BackgroundJob,
    LiteratureItem,
    NewsItem,
    ScheduleEntry,
    SupportMessage,
    SupportThread,
    User,
    UserBan,
    UserNotification,
    UserSession,
    UserSettings,
)
from api.twofa_service import TwoFAService
from api.user_agent_parser import UserAgentParser
from api.validators import LoginRequest, TwoFAVerifyRequest


