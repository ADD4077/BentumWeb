import asyncio
import io
import requests
import shutil
import sqlite3
import tempfile
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from unittest.mock import patch

from django.contrib.auth.hashers import check_password, make_password
from django.core.cache import cache
from django.core.management import call_command
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase
from django.test.utils import override_settings
from django.utils import timezone
from PIL import Image

from api.background_jobs import BackgroundJobService, BackgroundJobType
from api.ban_service import BanService
from api.content_parser_service import BNTUContentParserService
from api.content.schedule.views import WEEKDAY_NAMES, get_week_value_for_date
from api.func import authorize
from api.models import (
    Administration,
    BackgroundJob,
    LiteratureItem,
    NewsItem,
    ScheduleEntry,
    User,
    UserBan,
    UserSession,
    UserSettings,
)
from api.twofa_service import TwoFAService
from api.validators import LoginRequest, TwoFAVerifyRequest


class TwoFAServiceTests(TestCase):
    def setUp(self):
        self.service = TwoFAService()

    def test_generate_6fa_code(self):
        code = self.service.generate_6fa_code()
        self.assertEqual(len(code), 6)
        self.assertTrue(code.isdigit())

    def test_is_2fa_required_none_user(self):
        self.assertFalse(self.service.is_2fa_required(None))

    def test_is_2fa_required_disabled(self):
        class MockUser:
            twofa_enabled = False
            twofa_method = None

        self.assertFalse(self.service.is_2fa_required(MockUser()))

    @patch("api.twofa_service.TwoFAService._send_telegram_message", return_value=(True, "ok"))
    def test_successful_login_notification_contains_name_device_browser_and_ip(self, send_mock):
        user = User.objects.create(
            fullname="Свиридович Павел",
            faculty="FITR",
            student_code="1234567890",
            password="hashed-password",
        )

        class Request:
            META = {
                "REMOTE_ADDR": "172.18.0.1",
                "HTTP_USER_AGENT": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/135.0.0.0 Safari/537.36"
                ),
            }

        self.service.send_login_success_telegram_sync(user, Request())

        send_mock.assert_called_once()
        sent_text = send_mock.call_args[0][1]
        self.assertIn("Свиридович Павел, выполнен успешный вход в аккаунт Bentum.", sent_text)
        self.assertIn("Устройство: Windows 10/11", sent_text)
        self.assertIn("Браузер: Chrome 135.0", sent_text)
        self.assertIn("IP: 172.18.0.1", sent_text)


class ValidatorTests(TestCase):
    def test_login_request_valid(self):
        request = LoginRequest(student_code="123456", password="password")
        self.assertEqual(request.student_code, "123456")
        self.assertEqual(request.password, "password")

    def test_login_request_invalid_code(self):
        with self.assertRaises(ValueError):
            LoginRequest(student_code="abc", password="password")

    def test_twofa_verify_request_valid(self):
        request = TwoFAVerifyRequest(code="123456")
        self.assertEqual(request.code, "123456")

    def test_twofa_verify_request_invalid_length(self):
        with self.assertRaises(ValueError):
            TwoFAVerifyRequest(code="12345")


class AuthorizeTests(TestCase):
    class FakeResponse:
        def __init__(self, text, url, status_code=200):
            self.text = text
            self.url = url
            self.status_code = status_code

        def raise_for_status(self):
            if self.status_code >= 400:
                raise requests.HTTPError(f"HTTP {self.status_code}")

    class FakeSession:
        def __init__(self, get_response, post_response):
            self._get_response = get_response
            self._post_response = post_response
            self.verify = True
            self.headers = {}

        def get(self, *_args, **_kwargs):
            return self._get_response

        def post(self, *_args, **_kwargs):
            return self._post_response

    @patch("api.func.requests.Session")
    def test_authorize_success_when_redirect_not_pay_but_authenticated(self, session_cls):
        login_html = """
        <html><body>
            <form action="/user/auth">
                <input type="hidden" name="_token" value="csrf123">
                <input type="text" name="username">
                <input type="password" name="password">
            </form>
        </body></html>
        """
        profile_html = """
        <html><body>
            <h1 class="newsName">Иванов Иван Иванович</h1>
            <div class="dashboardInfo">2 курс, ФИТР, группа 12345</div>
            <a href="/logout">Выйти</a>
        </body></html>
        """
        session_cls.return_value = self.FakeSession(
            self.FakeResponse(login_html, "https://bntu.by/user/login"),
            self.FakeResponse(profile_html, "https://bntu.by/dashboard"),
        )

        result = authorize("1234567890", "password123")

        self.assertEqual(result, ("Иванов Иван Иванович", "ФИТР"))

    @patch("api.func.requests.Session")
    def test_authorize_returns_false_when_login_form_not_found(self, session_cls):
        session_cls.return_value = self.FakeSession(
            self.FakeResponse("<html><body>No form</body></html>", "https://bntu.by/user/login"),
            self.FakeResponse("", "https://bntu.by/user/auth"),
        )

        result = authorize("1234567890", "password123")

        self.assertFalse(result)

    @patch("api.func.requests.Session")
    def test_authorize_uses_fallbacks_when_profile_is_partial(self, session_cls):
        login_html = """
        <html><body>
            <form action="/user/auth">
                <input type="hidden" name="_token" value="csrf123">
                <input type="text" name="username">
                <input type="password" name="password">
            </form>
        </body></html>
        """
        profile_html = """
        <html><body>
            <a href="/logout">Выйти</a>
        </body></html>
        """
        session_cls.return_value = self.FakeSession(
            self.FakeResponse(login_html, "https://bntu.by/user/login"),
            self.FakeResponse(profile_html, "https://bntu.by/cabinet"),
        )

        result = authorize("1234567890", "password123")

        self.assertFalse(result)

    @patch("api.func.requests.Session")
    def test_authorize_rejects_dashboard_heading_and_service_list(self, session_cls):
        login_html = """
        <html><body>
            <form action="/user/auth">
                <input type="hidden" name="_token" value="csrf123">
                <input type="text" name="username">
                <input type="password" name="password">
            </form>
        </body></html>
        """
        profile_html = """
        <html><body>
            <h1>Личный кабинет</h1>
            <div class="dashboardInfo">
                для иностранных граждан (группа до 10 человек)
                Выдача дополнительного экземпляра договора
                Оформление посеместровой выписки
            </div>
            <a href="/logout">Выйти</a>
        </body></html>
        """
        session_cls.return_value = self.FakeSession(
            self.FakeResponse(login_html, "https://bntu.by/user/login"),
            self.FakeResponse(profile_html, "https://bntu.by/cabinet"),
        )

        result = authorize("1090352523", "password123")

        self.assertFalse(result)

    @patch("api.func.requests.Session")
    def test_authorize_extracts_real_profile_data_from_bntu_dashboard(self, session_cls):
        login_html = """
        <html><body>
            <form action="/user/auth">
                <input type="hidden" name="_token" value="csrf123">
                <input type="text" name="username">
                <input type="password" name="password">
            </form>
        </body></html>
        """
        profile_html = """
        <html><body>
            <h1 class="newsName">Личный кабинет</h1>
            <div>Привет, Свиридович Павел!</div>
            <div class="dashboardInfo">
                <h3>Обучение:</h3>
                Общее высшее образование, 1 курс, ИПФ, кафедра "ТиМП"
                <br>
                Группа 10903525, номер студенческого: 1090352523
            </div>
            <a href="/user/logout">Выйти</a>
        </body></html>
        """
        session_cls.return_value = self.FakeSession(
            self.FakeResponse(login_html, "https://bntu.by/user/login"),
            self.FakeResponse(profile_html, "https://bntu.by/user/pay"),
        )

        result = authorize("1090352523", "password123")

        self.assertEqual(result, ("Свиридович Павел", "ИПФ"))


class BanServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create(
            fullname="Test User",
            faculty="FITR",
            student_code="1234567890",
            password="hashed-password",
        )

    def test_check_ban_status_does_not_deactivate_expired_ban(self):
        expired_ban = UserBan.objects.create(
            student_code=self.user.student_code,
            user_id=self.user.id,
            banned_by_id=None,
            ban_duration_seconds=60,
            ban_reason="Expired",
            is_active=True,
        )
        UserBan.objects.filter(id=expired_ban.id).update(
            ban_date=timezone.now() - timedelta(hours=2)
        )

        status = BanService.check_ban_status(self.user.student_code)
        expired_ban.refresh_from_db()

        self.assertFalse(status["is_banned"])
        self.assertTrue(expired_ban.is_active)

    def test_cleanup_expired_bans_deactivates_expired_ban(self):
        expired_ban = UserBan.objects.create(
            student_code=self.user.student_code,
            user_id=self.user.id,
            banned_by_id=None,
            ban_duration_seconds=60,
            ban_reason="Expired",
            is_active=True,
        )
        UserBan.objects.filter(id=expired_ban.id).update(
            ban_date=timezone.now() - timedelta(hours=2)
        )

        cleaned = BanService.cleanup_expired_bans()
        expired_ban.refresh_from_db()

        self.assertEqual(cleaned, 1)
        self.assertFalse(expired_ban.is_active)

    def test_check_ban_status_keeps_forever_ban_active(self):
        forever_ban = UserBan.objects.create(
            student_code=self.user.student_code,
            user_id=self.user.id,
            banned_by_id=None,
            ban_duration_seconds=BanService.FOREVER_DURATION_SECONDS,
            ban_reason="Forever",
            is_active=True,
        )
        UserBan.objects.filter(id=forever_ban.id).update(
            ban_date=timezone.now() - timedelta(days=365)
        )

        status = BanService.check_ban_status(self.user.student_code)
        forever_ban.refresh_from_db()

        self.assertTrue(status["is_banned"])
        self.assertIsNone(status["ban_info"]["ban_end_date"])
        self.assertEqual(
            status["ban_info"]["ban_duration_seconds"],
            BanService.FOREVER_DURATION_SECONDS,
        )
        self.assertTrue(forever_ban.is_active)


class BackgroundJobTests(TestCase):
    def test_process_pending_support_notification_job(self):
        BackgroundJobService.enqueue(
            BackgroundJobType.SUPPORT_REQUEST_NOTIFICATION,
            {
                "user_data": {
                    "fullname": "Test User",
                    "student_code": "1234567890",
                    "faculty": "FITR",
                    "created_at": "2026-04-17 00:00:00",
                },
                "message": "Need help",
                "request_type": "support",
            },
        )

        with patch("api.background_jobs.TelegramService.send_support_request_sync", return_value=True):
            processed = BackgroundJobService.process_pending(limit=10)

        job = BackgroundJob.objects.get()
        self.assertEqual(processed, 1)
        self.assertEqual(job.status, BackgroundJob.STATUS_COMPLETED)

    def test_schedule_maintenance_jobs_enqueues_cleanup(self):
        BackgroundJobService.schedule_maintenance_jobs()
        job_types = set(BackgroundJob.objects.values_list("job_type", flat=True))

        self.assertIn(BackgroundJobType.CLEANUP_EXPIRED_BANS, job_types)
        self.assertIn(BackgroundJobType.CLEANUP_TELEGRAM_TOKENS, job_types)

    def test_schedule_content_jobs_enqueues_news_bootstrap_when_news_table_is_empty(self):
        BackgroundJobService.schedule_content_jobs()

        self.assertTrue(
            BackgroundJob.objects.filter(job_type=BackgroundJobType.NEWS_BOOTSTRAP).exists()
        )

    def test_schedule_content_jobs_enqueues_literature_bootstrap_when_literature_table_is_empty(self):
        BackgroundJobService.schedule_content_jobs()

        self.assertTrue(
            BackgroundJob.objects.filter(job_type=BackgroundJobType.LITERATURE_BOOTSTRAP).exists()
        )

    def test_schedule_content_jobs_enqueues_incremental_news_when_news_exist(self):
        NewsItem.objects.create(
            title="Existing News",
            link="https://times.bntu.by/news/existing",
            date="2026-04-21",
            timestamp=123456789,
            summary="summary",
            tags="#БНТУ",
            image_url="",
            reading_time=5,
        )

        BackgroundJobService.schedule_content_jobs()

        self.assertTrue(
            BackgroundJob.objects.filter(job_type=BackgroundJobType.NEWS_INCREMENTAL_SYNC).exists()
        )

    def test_schedule_content_jobs_enqueues_schedule_sync_when_schedule_table_is_empty(self):
        BackgroundJobService.schedule_content_jobs()

        self.assertTrue(
            BackgroundJob.objects.filter(job_type=BackgroundJobType.SCHEDULE_FULL_SYNC).exists()
        )

    def test_schedule_content_jobs_enqueues_incremental_literature_when_literature_exists(self):
        LiteratureItem.objects.create(
            source_id=101,
            handle="12345/101",
            title="Existing literature",
        )

        BackgroundJobService.schedule_content_jobs()

        self.assertTrue(
            BackgroundJob.objects.filter(job_type=BackgroundJobType.LITERATURE_INCREMENTAL_SYNC).exists()
        )

    def test_process_pending_runs_content_sync_jobs(self):
        BackgroundJobService.enqueue(BackgroundJobType.NEWS_BOOTSTRAP, {})
        BackgroundJobService.enqueue(BackgroundJobType.NEWS_INCREMENTAL_SYNC, {})
        BackgroundJobService.enqueue(BackgroundJobType.LITERATURE_BOOTSTRAP, {})
        BackgroundJobService.enqueue(BackgroundJobType.LITERATURE_INCREMENTAL_SYNC, {})
        BackgroundJobService.enqueue(BackgroundJobType.SCHEDULE_FULL_SYNC, {})

        with patch("api.background_jobs.BNTUContentParserService.sync_news_bootstrap", return_value=5) as bootstrap_mock, \
             patch("api.background_jobs.BNTUContentParserService.sync_news_incremental", return_value=2) as incremental_mock, \
             patch("api.background_jobs.BNTUContentParserService.sync_literature_bootstrap", return_value=4) as literature_bootstrap_mock, \
             patch("api.background_jobs.BNTUContentParserService.sync_literature_incremental", return_value=3) as literature_incremental_mock, \
             patch("api.background_jobs.BNTUContentParserService.sync_schedule", return_value=10) as schedule_mock:
            processed = BackgroundJobService.process_pending(limit=10)

        self.assertEqual(processed, 5)
        bootstrap_mock.assert_called_once()
        incremental_mock.assert_called_once()
        literature_bootstrap_mock.assert_called_once()
        literature_incremental_mock.assert_called_once()
        schedule_mock.assert_called_once()

    def test_recover_stale_running_jobs_requeues_stale_job(self):
        stale_job = BackgroundJob.objects.create(
            job_type=BackgroundJobType.NEWS_BOOTSTRAP,
            status=BackgroundJob.STATUS_RUNNING,
            attempts=1,
            max_attempts=3,
            started_at=timezone.now() - timedelta(hours=1),
            available_at=timezone.now() - timedelta(hours=1),
        )

        recovered = BackgroundJobService.recover_stale_running_jobs()

        stale_job.refresh_from_db()
        self.assertEqual(recovered, 1)
        self.assertEqual(stale_job.status, BackgroundJob.STATUS_PENDING)
        self.assertIsNone(stale_job.started_at)
        self.assertEqual(stale_job.last_error, "Recovered stale running job after worker interruption")

    def test_recover_stale_running_jobs_marks_exhausted_job_failed(self):
        stale_job = BackgroundJob.objects.create(
            job_type=BackgroundJobType.NEWS_BOOTSTRAP,
            status=BackgroundJob.STATUS_RUNNING,
            attempts=3,
            max_attempts=3,
            started_at=timezone.now() - timedelta(hours=1),
            available_at=timezone.now() - timedelta(hours=1),
        )

        BackgroundJobService.recover_stale_running_jobs()

        stale_job.refresh_from_db()
        self.assertEqual(stale_job.status, BackgroundJob.STATUS_FAILED)


class ContentParserServiceTests(TestCase):
    def setUp(self):
        self.service = BNTUContentParserService()

    def test_sync_news_incremental_uses_prefetched_links(self):
        NewsItem.objects.create(
            title="Known news",
            link="https://times.bntu.by/news/known",
            date="2026-04-22",
            timestamp=1710000000,
            summary="known",
            tags="#БНТУ",
            image_url="",
            reading_time=5,
        )

        async def fake_collect(existing_links):
            self.assertIn("https://times.bntu.by/news/known", existing_links)
            return [
                {
                    "title": "New news",
                    "link": "https://times.bntu.by/news/new",
                    "date": "2026-04-23",
                    "timestamp": 1710000001,
                    "summary": "new",
                    "tags": "#БНТУ",
                    "image_url": "",
                    "reading_time": 4,
                }
            ]

        with patch.object(self.service, "_collect_news_incremental", side_effect=fake_collect):
            created = self.service.sync_news_incremental()

        self.assertEqual(created, 1)
        self.assertTrue(NewsItem.objects.filter(link="https://times.bntu.by/news/new").exists())

    def test_sync_schedule_deduplicates_entries(self):
        duplicate_entry = {
            "group_number": "10903525",
            "week": 0,
            "day": "Понедельник",
            "time": "08:00",
            "matter": "История",
            "teacher": "Иванов И.И.",
            "frame": "Лекция",
            "classroom": "466",
        }

        async def fake_collect():
            return [duplicate_entry, dict(duplicate_entry)]

        with patch.object(self.service, "_collect_schedule", side_effect=fake_collect):
            created = self.service.sync_schedule()

        self.assertEqual(created, 1)
        self.assertEqual(ScheduleEntry.objects.count(), 1)

    def test_news_bootstrap_does_not_stop_after_single_stale_page(self):
        async def fake_fetch_page(_session, page):
            return [{"title": f"Page {page}", "link": f"https://times.bntu.by/news/{page}", "tags": ["#БНТУ"]}]

        async def fake_fetch_details(_session, title, full_link):
            page_number = int(full_link.rsplit("/", 1)[-1])
            if page_number in {1, 3}:
                return title, full_link, "22.04.2026 10:00", "summary", "", 3
            return title, full_link, "01.01.2020 10:00", "old summary", "", 3

        with patch.object(self.service, "_get_news_max_page", return_value=3), \
             patch.object(self.service, "_fetch_news_page", side_effect=fake_fetch_page), \
             patch.object(self.service, "_fetch_news_details", side_effect=fake_fetch_details):
            items = asyncio.run(self.service._collect_news_bootstrap())

        self.assertEqual(len(items), 2)
        self.assertEqual(
            [item["link"] for item in items],
            [
                "https://times.bntu.by/news/1",
                "https://times.bntu.by/news/3",
            ],
        )

    def test_news_bootstrap_continues_past_visible_pagination_limit(self):
        async def fake_fetch_page(_session, page):
            if page <= 6:
                return [{"title": f"Page {page}", "link": f"https://times.bntu.by/news/{page}", "tags": ["#БНТУ"]}]
            return []

        async def fake_fetch_details(_session, title, full_link):
            return title, full_link, "22.04.2026 10:00", "summary", "", 3

        with patch.object(self.service, "_get_news_max_page", return_value=4), \
             patch.object(self.service, "_fetch_news_page", side_effect=fake_fetch_page), \
             patch.object(self.service, "_fetch_news_details", side_effect=fake_fetch_details):
            items = asyncio.run(self.service._collect_news_bootstrap())

        self.assertEqual(len(items), 6)
        self.assertEqual(items[-1]["link"], "https://times.bntu.by/news/6")

    def test_parse_news_date_supports_russian_human_format(self):
        parsed = self.service._parse_news_date("22 апреля 2026, 10:00")

        self.assertIsNotNone(parsed)
        self.assertEqual(parsed.year, 2026)
        self.assertEqual(parsed.month, 4)
        self.assertEqual(parsed.day, 22)

    def test_parse_news_date_supports_mixed_cyrillic_latin_month(self):
        parsed = self.service._parse_news_date("27 мартa 2026 17:20")

        self.assertIsNotNone(parsed)
        self.assertEqual(parsed.year, 2026)
        self.assertEqual(parsed.month, 3)
        self.assertEqual(parsed.day, 27)

    def test_sync_literature_incremental_uses_source_ids(self):
        LiteratureItem.objects.create(
            source_id=200,
            handle="12345/200",
            title="Known literature",
        )

        async def fake_collect(existing_source_ids):
            self.assertIn(200, existing_source_ids)
            return [
                {
                    "source_id": 201,
                    "handle": "12345/201",
                    "title": "New literature",
                    "faculty": "ФИТР",
                    "category": "Учебные материалы",
                    "authors": "Иванов И.И.",
                    "publishing_date": "2026",
                    "description": "desc",
                    "image_url": "",
                    "download_size": "1024",
                    "download_link": "https://rep.bntu.by/bitstream/12345/201/file.pdf",
                }
            ]

        with patch.object(self.service, "_collect_literature_incremental", side_effect=fake_collect):
            created = self.service.sync_literature_incremental()

        self.assertEqual(created, 1)
        self.assertTrue(LiteratureItem.objects.filter(source_id=201).exists())

    def test_collect_literature_incremental_stops_on_existing_source_id(self):
        async def fake_fetch_page(_session, offset):
            if offset == 0:
                return [{"id": 300, "name": "Known"}, {"id": 299, "name": "New"}]
            return []

        with patch.object(self.service, "_fetch_literature_page", side_effect=fake_fetch_page), \
             patch.object(self.service, "_fetch_literature_payload") as payload_mock:
            items = asyncio.run(self.service._collect_literature_incremental({300}))

        self.assertEqual(items, [])
        payload_mock.assert_not_called()


class AuthAndSupportEndpointTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create(
            fullname="Queue User",
            faculty="FITR",
            student_code="1234567890",
            password="hashed-password",
        )

    def test_registration_enqueues_new_user_notification(self):
        with patch("api.core.views.authorize", return_value=("New User", "FITR")):
            response = self.client.post(
                "/api/save_data",
                data='{"studentCode":"1234567891","password":"password123"}',
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            BackgroundJob.objects.filter(job_type=BackgroundJobType.NEW_USER_NOTIFICATION).exists()
        )

    def test_support_request_is_queued(self):
        session = self.client.session
        session["is_authenticated"] = True
        session["student_code"] = self.user.student_code
        session.save()

        response = self.client.post(
            "/api/support/submit",
            data='{"message":"Need help","type":"support"}',
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            BackgroundJob.objects.filter(job_type=BackgroundJobType.SUPPORT_REQUEST_NOTIFICATION).exists()
        )


class AuthFlowEndpointTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create(
            fullname="Existing User",
            faculty="FITR",
            student_code="1234567890",
            password=make_password("password123"),
        )

    def test_login_existing_user_returns_authenticated_payload(self):
        anonymous_session = self.client.session
        anonymous_session["prefill"] = "value"
        anonymous_session.save()
        old_session_key = anonymous_session.session_key

        response = self.client.post(
            "/api/save_data",
            data='{"studentCode":"1234567890","password":"password123"}',
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertEqual(payload["user"]["student_code"], self.user.student_code)
        self.assertEqual(payload["user"]["role"], "student")

        session = self.client.session
        self.assertTrue(session.get("is_authenticated"))
        self.assertEqual(session.get("student_code"), self.user.student_code)
        self.assertNotEqual(session.session_key, old_session_key)

    def test_legacy_save_data_subpaths_are_not_routed(self):
        response = self.client.get("/api/save_data/auth/check")
        self.assertEqual(response.status_code, 404)

    def test_auth_check_requires_2fa_when_pending(self):
        self.user.twofa_enabled = True
        self.user.twofa_method = "telegram"
        self.user.save(update_fields=["twofa_enabled", "twofa_method"])

        session = self.client.session
        session["is_authenticated"] = True
        session["student_code"] = self.user.student_code
        session["twofa_pending"] = True
        session["twofa_verified"] = False
        session.save()

        response = self.client.get("/api/auth/check")

        self.assertEqual(response.status_code, 401)
        payload = response.json()
        self.assertFalse(payload["success"])
        self.assertTrue(payload["requires_2fa"])

    def test_twofa_pending_cannot_disable_twofa_config(self):
        self.user.twofa_enabled = True
        self.user.twofa_method = "telegram"
        self.user.save(update_fields=["twofa_enabled", "twofa_method"])

        session = self.client.session
        session["is_authenticated"] = True
        session["student_code"] = self.user.student_code
        session["twofa_pending"] = True
        session["twofa_verified"] = False
        session.save()

        response = self.client.post(
            "/api/2fa/config",
            data='{"enabled":false}',
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertTrue(response.json()["requires_2fa"])

    def test_twofa_pending_cannot_generate_telegram_link(self):
        self.user.twofa_enabled = True
        self.user.twofa_method = "telegram"
        self.user.save(update_fields=["twofa_enabled", "twofa_method"])

        session = self.client.session
        session["is_authenticated"] = True
        session["student_code"] = self.user.student_code
        session["twofa_pending"] = True
        session["twofa_verified"] = False
        session.save()

        response = self.client.post("/api/telegram/generate-link")

        self.assertEqual(response.status_code, 403)
        self.assertTrue(response.json()["requires_2fa"])

    def test_twofa_pending_cannot_unlink_telegram_account(self):
        self.user.twofa_enabled = True
        self.user.twofa_method = "telegram"
        self.user.save(update_fields=["twofa_enabled", "twofa_method"])

        session = self.client.session
        session["is_authenticated"] = True
        session["student_code"] = self.user.student_code
        session["twofa_pending"] = True
        session["twofa_verified"] = False
        session.save()

        response = self.client.post("/api/telegram/unlink")

        self.assertEqual(response.status_code, 403)
        self.assertTrue(response.json()["requires_2fa"])

    def test_verify_2fa_marks_session_verified(self):
        self.user.twofa_enabled = True
        self.user.twofa_method = "telegram"
        self.user.save(update_fields=["twofa_enabled", "twofa_method"])

        session = self.client.session
        session["is_authenticated"] = True
        session["student_code"] = self.user.student_code
        session["twofa_pending"] = True
        session["twofa_verified"] = False
        session.save()

        service = TwoFAService()
        service.store_2fa_code(self.user.student_code, "123456", self.client)

        response = self.client.post(
            "/api/2fa/verify",
            data='{"code":"123456"}',
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])

        updated_session = self.client.session
        self.assertFalse(updated_session.get("twofa_pending"))
        self.assertTrue(updated_session.get("twofa_verified"))

    def test_verify_2fa_locks_after_too_many_attempts(self):
        cache.clear()
        self.user.twofa_enabled = True
        self.user.twofa_method = "telegram"
        self.user.save(update_fields=["twofa_enabled", "twofa_method"])

        session = self.client.session
        session["is_authenticated"] = True
        session["student_code"] = self.user.student_code
        session["twofa_pending"] = True
        session["twofa_verified"] = False
        session.save()

        service = TwoFAService()
        service.store_2fa_code(self.user.student_code, "123456", self.client)

        for _ in range(6):
            response = self.client.post(
                "/api/2fa/verify",
                data='{"code":"000000"}',
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 429)

        locked_response = self.client.post(
            "/api/2fa/verify",
            data='{"code":"123456"}',
            content_type="application/json",
        )

        self.assertEqual(locked_response.status_code, 429)
        self.assertIn("retry_after", locked_response.json())

    def test_resend_2fa_uses_cooldown(self):
        cache.clear()
        self.user.twofa_enabled = True
        self.user.twofa_method = "telegram"
        self.user.save(update_fields=["twofa_enabled", "twofa_method"])

        session = self.client.session
        session["is_authenticated"] = True
        session["student_code"] = self.user.student_code
        session["twofa_pending"] = True
        session["twofa_verified"] = False
        session.save()

        with patch(
            "api.security.twofa.views.twofa_service.send_2fa_code_telegram_sync",
            return_value=(True, "ok"),
        ):
            first_response = self.client.post("/api/2fa/resend")
            second_response = self.client.post("/api/2fa/resend")

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(second_response.status_code, 429)
        self.assertIn("retry_after", second_response.json())

    @patch("api.security.twofa.views.twofa_service.send_login_success_telegram_sync", return_value=(True, "ok"))
    def test_verify_2fa_sends_successful_login_notification_when_enabled(self, send_mock):
        self.user.twofa_enabled = True
        self.user.twofa_method = "telegram"
        self.user.save(update_fields=["twofa_enabled", "twofa_method"])
        UserSettings.objects.update_or_create(
            user=self.user,
            defaults={"notify_successful_login": True},
        )

        session = self.client.session
        session["is_authenticated"] = True
        session["student_code"] = self.user.student_code
        session["twofa_pending"] = True
        session["twofa_verified"] = False
        session.save()

        service = TwoFAService()
        service.store_2fa_code(self.user.student_code, "123456", self.client)

        response = self.client.post(
            "/api/2fa/verify",
            data='{"code":"123456"}',
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        send_mock.assert_called_once()

    @override_settings(LOGIN_RATE_LIMIT_ATTEMPTS=3, LOGIN_RATE_LIMIT_TTL_SECONDS=300)
    @patch("api.core.views.authorize", return_value=False)
    def test_login_rate_limit_blocks_same_client_across_different_student_codes(self, _authorize_mock):
        for student_code in ("1234567891", "1234567892", "1234567893"):
            response = self.client.post(
                "/api/save_data",
                data=f'{{"studentCode":"{student_code}","password":"password123"}}',
                content_type="application/json",
            )
            self.assertEqual(response.status_code, 401)

        blocked_response = self.client.post(
            "/api/save_data",
            data='{"studentCode":"1234567894","password":"password123"}',
            content_type="application/json",
        )

        self.assertEqual(blocked_response.status_code, 429)


class AdminEndpointTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.admin_user = User.objects.create(
            fullname="Admin User",
            faculty="FITR",
            student_code="9999999999",
            password=make_password("password123"),
        )
        Administration.objects.create(administrator=self.admin_user, is_active=True)

        self.regular_user = User.objects.create(
            fullname="Regular User",
            faculty="FITR",
            student_code="1234567890",
            password=make_password("password123"),
        )

        session = self.client.session
        session["is_authenticated"] = True
        session["student_code"] = self.admin_user.student_code
        session.save()

    def test_admin_can_create_user(self):
        response = self.client.post(
            "/api/admin/users/create",
            data='{"fullname":"New User","student_code":"1111111111","faculty":"FITR","role":"teacher","password":"password123"}',
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])
        self.assertTrue(User.objects.filter(student_code="1111111111").exists())
        self.assertEqual(User.objects.get(student_code="1111111111").role, "teacher")

    def test_admin_cannot_create_user_with_administrator_role(self):
        response = self.client.post(
            "/api/admin/users/create",
            data='{"fullname":"Forbidden Role","student_code":"1111111112","faculty":"FITR","role":"administrator","password":"password123"}',
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.json()["success"])
        self.assertFalse(User.objects.filter(student_code="1111111112").exists())

    def test_auth_check_marks_system_admin_without_changing_product_role(self):
        response = self.client.get("/api/auth/check")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertEqual(payload["user"]["role"], User.ROLE_STUDENT)
        self.assertTrue(payload["user"]["is_admin"])

    def test_auth_check_returns_datetime_fields_as_iso_strings(self):
        self.admin_user.created_at = timezone.now() - timedelta(days=2)
        self.admin_user.last_login = timezone.now()
        self.admin_user.save(update_fields=["created_at", "last_login"])

        response = self.client.get("/api/auth/check")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIsInstance(payload["user"]["created_at"], str)
        self.assertIn("T", payload["user"]["created_at"])
        self.assertIsInstance(payload["user"]["last_login"], str)
        self.assertIn("T", payload["user"]["last_login"])

    def test_admin_can_ban_and_unban_user(self):
        ban_response = self.client.post(
            "/api/admin/users/ban",
            data=f'{{"user_id":{self.regular_user.id},"reason":"Violation","duration":7}}',
            content_type="application/json",
        )

        self.assertEqual(ban_response.status_code, 200)
        self.assertTrue(ban_response.json()["success"])
        self.assertTrue(BanService.check_ban_status(self.regular_user.student_code)["is_banned"])

        unban_response = self.client.post(
            "/api/admin/users/unban",
            data=f'{{"user_id":{self.regular_user.id}}}',
            content_type="application/json",
        )

        self.assertEqual(unban_response.status_code, 200)
        self.assertTrue(unban_response.json()["success"])
        self.assertFalse(BanService.check_ban_status(self.regular_user.student_code)["is_banned"])

    def test_admin_can_ban_user_forever(self):
        ban_response = self.client.post(
            "/api/admin/users/ban",
            data=f'{{"user_id":{self.regular_user.id},"reason":"Forever violation","duration":-1}}',
            content_type="application/json",
        )

        self.assertEqual(ban_response.status_code, 200)
        self.assertTrue(ban_response.json()["success"])

        status = BanService.check_ban_status(self.regular_user.student_code)
        self.assertTrue(status["is_banned"])
        self.assertIsNone(status["ban_info"]["ban_end_date"])
        self.assertEqual(
            status["ban_info"]["ban_duration_seconds"],
            BanService.FOREVER_DURATION_SECONDS,
        )

    def test_admin_can_ban_user_with_custom_duration_seconds(self):
        ban_response = self.client.post(
            "/api/admin/users/ban",
            data=f'{{"user_id":{self.regular_user.id},"reason":"Custom violation","duration_seconds":5400}}',
            content_type="application/json",
        )

        self.assertEqual(ban_response.status_code, 200)
        self.assertTrue(ban_response.json()["success"])

        status = BanService.check_ban_status(self.regular_user.student_code)
        self.assertTrue(status["is_banned"])
        self.assertEqual(status["ban_info"]["ban_duration_seconds"], 5400)

    def test_non_admin_cannot_create_user(self):
        other_client = Client()
        session = other_client.session
        session["is_authenticated"] = True
        session["student_code"] = self.regular_user.student_code
        session.save()

        response = other_client.post(
            "/api/admin/users/create",
            data='{"fullname":"Blocked User","student_code":"2222222222","faculty":"FITR","password":"password123"}',
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertFalse(User.objects.filter(student_code="2222222222").exists())


class MediaSessionAndEdgeCaseTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create(
            fullname="Media User",
            faculty="FITR",
            student_code="5555555555",
            password=make_password("password123"),
        )
        session = self.client.session
        session["is_authenticated"] = True
        session["student_code"] = self.user.student_code
        session.save()

    def _make_image_upload(self, name="avatar.png", size=(32, 32), color=(16, 185, 129)):
        buffer = io.BytesIO()
        image = Image.new("RGB", size, color)
        image.save(buffer, format="PNG")
        return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")

    def test_media_upload_succeeds_for_authenticated_user(self):
        media_root = tempfile.mkdtemp(prefix="bentum-test-media-")
        try:
            with override_settings(MEDIA_ROOT=media_root):
                response = self.client.post(
                    "/api/media/upload",
                    data={
                        "file": self._make_image_upload(),
                        "media_type": "avatar",
                    },
                )

            self.assertEqual(response.status_code, 200)
            payload = response.json()
            self.assertTrue(payload["success"])
            self.assertEqual(payload["media"]["media_type"], "avatar")
            self.assertTrue(payload["media"]["url"])
        finally:
            shutil.rmtree(media_root, ignore_errors=True)

    def test_media_upload_requires_authentication(self):
        anonymous = Client()
        response = anonymous.post(
            "/api/media/upload",
            data={
                "file": self._make_image_upload(),
                "media_type": "avatar",
            },
        )

        self.assertEqual(response.status_code, 401)
        self.assertFalse(response.json()["success"])

    def test_get_sessions_and_logout_remove_session_record(self):
        session_key = self.client.session.session_key
        UserSession.objects.create(
            student_code=self.user.student_code,
            session_key=session_key,
            browser="Test Browser",
            os="Test OS",
            ip_address="127.0.0.1",
        )

        sessions_response = self.client.get("/api/sessions")
        self.assertEqual(sessions_response.status_code, 200)
        sessions_payload = sessions_response.json()
        self.assertTrue(sessions_payload["success"])
        self.assertEqual(sessions_payload["total_count"], 1)

        logout_response = self.client.post("/api/logout")
        self.assertEqual(logout_response.status_code, 200)
        self.assertTrue(logout_response.json()["success"])
        self.assertFalse(UserSession.objects.filter(session_key=session_key).exists())

        auth_check_response = self.client.get("/api/auth/check")
        self.assertEqual(auth_check_response.status_code, 401)

    def test_support_request_rejects_empty_message(self):
        response = self.client.post(
            "/api/support/submit",
            data='{"message":"   ","type":"support"}',
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.json()["success"])

    def test_support_request_rejects_message_longer_than_512_symbols(self):
        response = self.client.post(
            "/api/support/submit",
            data=f'{{"message":"{"a" * 513}","type":"support"}}',
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.json()["success"])

    def test_change_password_rejects_wrong_current_password(self):
        response = self.client.post(
            "/api/change-password/password",
            data='{"current_password":"wrong-password","new_password":"newpassword123","confirm_password":"newpassword123"}',
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.json()["success"])
        self.user.refresh_from_db()
        self.assertTrue(check_password("password123", self.user.password))

    def test_change_password_updates_password_when_current_password_is_valid(self):
        response = self.client.post(
            "/api/change-password/password",
            data='{"current_password":"password123","new_password":"newpassword123","confirm_password":"newpassword123"}',
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])
        self.user.refresh_from_db()
        self.assertTrue(check_password("newpassword123", self.user.password))

    def test_profile_preferences_updates_successful_login_notifications(self):
        response = self.client.post(
            "/api/profile/preferences",
            data='{"notify_successful_login":false}',
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])
        self.assertFalse(UserSettings.objects.get(user=self.user).notify_successful_login)


class _FakeSQLiteConnection:
    def __init__(self, cursor):
        self._cursor = cursor

    def __enter__(self):
        return self._cursor

    def __exit__(self, exc_type, exc_val, exc_tb):
        return False


class _NewsCursor:
    def __init__(self):
        self.last_query = ""

    def execute(self, query, params=None):
        self.last_query = query
        self.last_params = params or []

    def fetchone(self):
        if "COUNT(*)" in self.last_query:
            return (2,)
        return None

    def fetchall(self):
        return [
            (1, "Первая новость", "https://example.com/1", "2026-04-01", "Кратко 1", "#БНТУ", "https://example.com/1.jpg", 5, 100),
            (2, "Вторая новость", "https://example.com/2", "2026-04-02", "Кратко 2", "#Спорт", "https://example.com/2.jpg", 7, 200),
        ]


class _LiteratureCursor:
    def __init__(self):
        self.last_query = ""

    def execute(self, query, params=None):
        self.last_query = query
        self.last_params = params or []

    def fetchone(self):
        if "COUNT(*)" in self.last_query:
            return (1,)
        return None

    def fetchall(self):
        return [
            (
                1,
                "Высшая математика",
                "ФИТР",
                "mathematics",
                "Иван Иванов",
                "2024",
                "Учебное пособие",
                "https://example.com/book.jpg",
                "12 MB",
                "https://example.com/book.pdf",
            )
        ]


class _ScheduleCursor:
    def __init__(self):
        self.last_query = ""

    def execute(self, query, params=None):
        self.last_query = query
        self.last_params = params or []

    def fetchall(self):
        return [
            ("monday", 1, "09:00", "Математика", "Лекция", "Иванов И.И.", "101"),
            ("monday", 2, "11:00", "Физика", "Практика", "Петров П.П.", "202"),
        ]


class ContentEndpointTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create(
            fullname="Content User",
            faculty="FITR",
            student_code="1234567890",
            password=make_password("password123"),
        )

    def test_public_user_by_code_omits_sensitive_fields(self):
        response = self.client.get(f"/api/user/by-code/{self.user.student_code}")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertEqual(payload["user"]["student_code"], self.user.student_code)
        self.assertNotIn("faculty", payload["user"])
        self.assertNotIn("role", payload["user"])
        self.assertNotIn("twofa_enabled", payload["user"])
        self.assertNotIn("twofa_method", payload["user"])
        self.assertNotIn("last_login", payload["user"])
        self.assertNotIn("is_admin", payload["user"])
        self.assertNotIn("is_banned", payload["user"])
        self.assertNotIn("ban_info", payload["user"])

    def test_news_endpoint_returns_paginated_items(self):
        with patch("api.content.news.views.get_sqlite_connection", return_value=_FakeSQLiteConnection(_NewsCursor())):
            response = self.client.get("/api/news", {"page": 1, "page_size": 6, "sort": "date_desc"})

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertEqual(payload["total"], 2)
        self.assertEqual(len(payload["items"]), 2)
        self.assertEqual(payload["items"][0]["title"], "Первая новость")

    def test_literature_endpoint_returns_items(self):
        with patch("api.content.literature.views.get_sqlite_connection", return_value=_FakeSQLiteConnection(_LiteratureCursor())):
            response = self.client.get("/api/literature", {"page": 1, "page_size": 6, "sort": "title_asc"})

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertEqual(payload["total"], 1)
        self.assertEqual(payload["items"][0]["title"], "Высшая математика")

    def test_schedule_requires_authentication(self):
        response = self.client.get("/api/schedule")
        self.assertEqual(response.status_code, 401)

    def test_schedule_returns_group_schedule_for_authenticated_user(self):
        session = self.client.session
        session["is_authenticated"] = True
        session["student_code"] = self.user.student_code
        session.save()

        with patch("api.content.schedule.views.get_sqlite_connection", return_value=_FakeSQLiteConnection(_ScheduleCursor())):
            response = self.client.get("/api/schedule")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertEqual(payload["student_code"], self.user.student_code)
        self.assertIn("monday", payload["schedule"])
        self.assertIn("upper", payload["schedule"]["monday"])
        self.assertEqual(payload["schedule"]["monday"]["upper"][0]["subject"], "Математика")

    def test_schedule_returns_404_when_no_rows_found(self):
        session = self.client.session
        session["is_authenticated"] = True
        session["student_code"] = self.user.student_code
        session.save()

        empty_cursor = _ScheduleCursor()
        empty_cursor.fetchall = lambda: []

        with patch("api.content.schedule.views.get_sqlite_connection", return_value=_FakeSQLiteConnection(empty_cursor)):
            response = self.client.get("/api/schedule")

        self.assertEqual(response.status_code, 404)

    @patch("api.content.schedule.views.get_moscow_now")
    def test_next_schedule_lesson_returns_current_or_upcoming_lesson(self, now_mock):
        session = self.client.session
        session["is_authenticated"] = True
        session["student_code"] = self.user.student_code
        session.save()

        now_mock.return_value = timezone.make_aware(
            datetime(2026, 4, 20, 8, 30),
            timezone=ZoneInfo("Europe/Moscow"),
        )

        week_value = get_week_value_for_date(now_mock.return_value.date())

        ScheduleEntry.objects.create(
            group_number="12345678",
            week=week_value,
            day="Понедельник",
            time="08:00 - 09:30",
            matter="Математика",
            teacher="Иванов И.И.",
            frame="17",
            classroom="506",
        )
        ScheduleEntry.objects.create(
            group_number="12345678",
            week=week_value,
            day="Понедельник",
            time="11:40 - 13:10",
            matter="Физика",
            teacher="Петров П.П.",
            frame="20",
            classroom="601",
        )

        response = self.client.get("/api/schedule/next")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertEqual(payload["next_lesson"]["subject"], "Математика")
        self.assertEqual(payload["next_lesson"]["frame"], "17")
        self.assertEqual(payload["next_lesson"]["classroom"], "506")
        self.assertEqual(payload["next_lesson"]["location_text"], "Корпус 17, ауд. 506")
        self.assertTrue(payload["next_lesson"]["is_today"])

    @patch("api.content.schedule.views.get_moscow_now")
    def test_next_schedule_lesson_rolls_forward_to_next_day(self, now_mock):
        session = self.client.session
        session["is_authenticated"] = True
        session["student_code"] = self.user.student_code
        session.save()

        now_mock.return_value = timezone.make_aware(
            datetime(2026, 4, 20, 21, 0),
            timezone=ZoneInfo("Europe/Moscow"),
        )

        next_day_week_value = get_week_value_for_date(now_mock.return_value.date() + timedelta(days=1))

        ScheduleEntry.objects.create(
            group_number="12345678",
            week=next_day_week_value,
            day="Вторник",
            time="09:55 - 11:25",
            matter="Английский язык",
            teacher="Сидорова А.А.",
            frame="1",
            classroom="432",
        )

        response = self.client.get("/api/schedule/next")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertEqual(payload["next_lesson"]["day"], "Вторник")
        self.assertEqual(payload["next_lesson"]["subject"], "Английский язык")
        self.assertFalse(payload["next_lesson"]["is_today"])

    @patch("api.content.schedule.views.get_moscow_now")
    def test_next_schedule_lesson_ignores_foreign_student_code_query_param(self, now_mock):
        session = self.client.session
        session["is_authenticated"] = True
        session["student_code"] = self.user.student_code
        session.save()

        now_mock.return_value = timezone.make_aware(
            datetime(2026, 4, 20, 8, 30),
            timezone=ZoneInfo("Europe/Moscow"),
        )

        week_value = get_week_value_for_date(now_mock.return_value.date())
        day_name = WEEKDAY_NAMES[now_mock.return_value.date().weekday()]

        ScheduleEntry.objects.create(
            group_number="12345678",
            week=week_value,
            day=day_name,
            time="08:00 - 09:30",
            matter="Mathematics",
            teacher="Ivanov I.I.",
            frame="17",
            classroom="506",
        )
        ScheduleEntry.objects.create(
            group_number="99999999",
            week=week_value,
            day=day_name,
            time="08:00 - 09:30",
            matter="Foreign lesson",
            teacher="Petrov P.P.",
            frame="99",
            classroom="999",
        )

        response = self.client.get("/api/schedule/next", {"student_code": "9999999999"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["next_lesson"]["subject"], "Mathematics")

    @patch("api.content.schedule.views.get_moscow_now")
    def test_next_schedule_lesson_supports_trailing_slash_route(self, now_mock):
        session = self.client.session
        session["is_authenticated"] = True
        session["student_code"] = self.user.student_code
        session.save()

        now_mock.return_value = timezone.make_aware(
            datetime(2026, 4, 20, 8, 30),
            timezone=ZoneInfo("Europe/Moscow"),
        )

        week_value = get_week_value_for_date(now_mock.return_value.date())
        day_name = WEEKDAY_NAMES[now_mock.return_value.date().weekday()]

        ScheduleEntry.objects.create(
            group_number="12345678",
            week=week_value,
            day=day_name,
            time="08:00 - 09:30",
            matter="Mathematics",
            teacher="Ivanov I.I.",
            frame="17",
            classroom="506",
        )

        response = self.client.get("/api/schedule/next/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["next_lesson"]["subject"], "Mathematics")


    def test_schedule_handles_sqlite_error(self):
        session = self.client.session
        session["is_authenticated"] = True
        session["student_code"] = self.user.student_code
        session.save()

        class BrokenCursor:
            def execute(self, query, params=None):
                raise sqlite3.Error("broken")

        with patch("api.content.schedule.views.get_sqlite_connection", return_value=_FakeSQLiteConnection(BrokenCursor())):
            response = self.client.get("/api/schedule")

        self.assertEqual(response.status_code, 500)
        self.assertFalse(
            BackgroundJob.objects.filter(job_type=BackgroundJobType.SUPPORT_REQUEST_NOTIFICATION).exists()
        )

    def test_resend_2fa_requires_pending_state(self):
        session = self.client.session
        session["is_authenticated"] = True
        session["student_code"] = self.user.student_code
        session["twofa_pending"] = False
        session["twofa_verified"] = False
        session.save()

        response = self.client.post("/api/2fa/resend")

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.json()["success"])


class TelegramBindingEndpointTests(TestCase):
    @override_settings(TELEGRAM_INTERNAL_API_TOKEN="test-internal-token")
    def test_telegram_bind_endpoint_requires_internal_token(self):
        client = Client(enforce_csrf_checks=True)

        with patch(
            "api.integrations.telegram.views.telegram_binding_service.bind_telegram_account_sync",
            return_value=(True, "Telegram аккаунт успешно привязан"),
        ) as bind_mock:
            forbidden_response = client.post(
                "/api/telegram/bind",
                data='{"token":"test-token","telegram":{"id":123456,"username":"tester"}}',
                content_type="application/json",
            )
            response = client.post(
                "/api/telegram/bind",
                data='{"token":"test-token","telegram":{"id":123456,"username":"tester"}}',
                content_type="application/json",
                HTTP_X_INTERNAL_TOKEN="test-internal-token",
            )

        self.assertEqual(forbidden_response.status_code, 403)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/json")
        self.assertTrue(response.json()["success"])
        bind_mock.assert_called_once_with("test-token", {"id": 123456, "username": "tester"})


class BNTUFacultyParsingRegressionTests(TestCase):
    class FakeResponse:
        def __init__(self, text, url):
            self.text = text
            self.url = url

        def raise_for_status(self):
            return None

    class FakeSession:
        def __init__(self, *responses):
            self._responses = list(responses)
            self.headers = {}
            self.verify = True

        def get(self, *_args, **_kwargs):
            return self._responses.pop(0)

        def post(self, *_args, **_kwargs):
            return self._responses.pop(0)

    @patch("api.func.requests.Session")
    def test_authorize_ignores_education_stage_when_extracting_faculty(self, session_cls):
        login_html = """
        <html><body>
            <form action="/user/auth">
                <input type="hidden" name="_token" value="csrf123">
                <input type="text" name="username">
                <input type="password" name="password">
            </form>
        </body></html>
        """
        profile_html = """
        <html><body>
            <h1 class="newsName">Личный кабинет</h1>
            <div>Привет, Иванов Иван!</div>
            <div class="dashboardInfo">
                <h3>Обучение:</h3>
                Первая ступень, 2 курс, ФИТР, кафедра "ИСИТ"
                <br>
                Группа 12345678, номер студенческого: 1234567890
            </div>
            <a href="/user/logout">Выйти</a>
        </body></html>
        """
        session_cls.return_value = self.FakeSession(
            self.FakeResponse(login_html, "https://bntu.by/user/login"),
            self.FakeResponse(profile_html, "https://bntu.by/user/pay"),
        )

        result = authorize("1234567890", "password123")

        self.assertEqual(result, ("Иванов Иван", "ФИТР"))


class SyncBntuContentCommandTests(TestCase):
    def test_news_bootstrap_option_targets_only_news(self):
        with patch(
            "api.management.commands.sync_bntu_content.BNTUContentParserService.sync_news_bootstrap",
            return_value=12,
        ) as news_mock, patch(
            "api.management.commands.sync_bntu_content.BNTUContentParserService.sync_literature"
        ) as literature_mock, patch(
            "api.management.commands.sync_bntu_content.BNTUContentParserService.sync_schedule"
        ) as schedule_mock:
            call_command("sync_bntu_content", news_bootstrap=True)

        news_mock.assert_called_once()
        literature_mock.assert_not_called()
        schedule_mock.assert_not_called()

    def test_literature_bootstrap_option_targets_only_literature(self):
        with patch(
            "api.management.commands.sync_bntu_content.BNTUContentParserService.sync_literature_bootstrap",
            return_value=34,
        ) as literature_mock, patch(
            "api.management.commands.sync_bntu_content.BNTUContentParserService.sync_news"
        ) as news_mock, patch(
            "api.management.commands.sync_bntu_content.BNTUContentParserService.sync_schedule"
        ) as schedule_mock:
            call_command("sync_bntu_content", literature_bootstrap=True)

        literature_mock.assert_called_once()
        news_mock.assert_not_called()
        schedule_mock.assert_not_called()
