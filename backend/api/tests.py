import io
import requests
import shutil
import sqlite3
import tempfile
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.hashers import make_password
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase
from django.test.utils import override_settings
from django.utils import timezone
from PIL import Image

from api.background_jobs import BackgroundJobService, BackgroundJobType
from api.ban_service import BanService
from api.func import authorize
from api.models import Administration, BackgroundJob, User, UserBan, UserSession
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
        response = self.client.post(
            "/api/save_data",
            data='{"studentCode":"1234567890","password":"password123"}',
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertEqual(payload["user"]["student_code"], self.user.student_code)

        session = self.client.session
        self.assertTrue(session.get("is_authenticated"))
        self.assertEqual(session.get("student_code"), self.user.student_code)

    def test_auth_check_requires_2fa_when_pending(self):
        self.user.twofa_enabled = True
        self.user.twofa_method = "email"
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

    def test_verify_2fa_marks_session_verified(self):
        self.user.twofa_enabled = True
        self.user.twofa_method = "email"
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
            data='{"fullname":"New User","student_code":"1111111111","faculty":"FITR","password":"password123"}',
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])
        self.assertTrue(User.objects.filter(student_code="1111111111").exists())

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
    def test_telegram_bind_endpoint_returns_json_without_csrf_token(self):
        client = Client(enforce_csrf_checks=True)

        with patch(
            "api.integrations.telegram.views.telegram_binding_service.bind_telegram_account_sync",
            return_value=(True, "Telegram аккаунт успешно привязан"),
        ) as bind_mock:
            response = client.post(
                "/api/telegram/bind",
                data='{"token":"test-token","telegram":{"id":123456,"username":"tester"}}',
                content_type="application/json",
            )

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
