from ._tests_common import *


class ClientIpTests(TestCase):
    @override_settings(TRUST_X_FORWARDED_FOR=False)
    def test_client_ip_ignores_forwarded_for_by_default(self):
        request = SimpleNamespace(
            META={
                "HTTP_X_FORWARDED_FOR": "203.0.113.10, 10.0.0.5",
                "REMOTE_ADDR": "10.0.0.9",
            },
        )

        self.assertEqual(get_client_ip(request), "10.0.0.9")

    @override_settings(TRUST_X_FORWARDED_FOR=True)
    def test_client_ip_uses_forwarded_for_when_proxy_is_trusted(self):
        request = SimpleNamespace(
            META={
                "HTTP_X_FORWARDED_FOR": "203.0.113.10, 10.0.0.5",
                "REMOTE_ADDR": "10.0.0.9",
            },
        )

        self.assertEqual(get_client_ip(request), "203.0.113.10")


class UserAgentParserTests(TestCase):
    def test_android_user_agent_is_not_classified_as_linux(self):
        parsed = UserAgentParser.parse(
            "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
        )

        self.assertEqual(parsed["os"], "Android 14")

    def test_iphone_user_agent_is_not_classified_as_macos(self):
        parsed = UserAgentParser.parse(
            "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) "
            "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1"
        )

        self.assertEqual(parsed["os"], "iOS 18.1 (iPhone)")

    def test_ipad_user_agent_is_not_classified_as_macos(self):
        parsed = UserAgentParser.parse(
            "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) "
            "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
        )

        self.assertEqual(parsed["os"], "iOS 17.5 (iPad)")


class AuthUserModelTests(TestCase):
    def test_django_auth_uses_api_user_model(self):
        user_model = get_user_model()
        self.assertEqual(user_model._meta.label, "api.User")
        self.assertEqual(user_model.USERNAME_FIELD, "student_code")

    def test_create_superuser_uses_student_code_identifier(self):
        user_model = get_user_model()
        user = user_model.objects.create_superuser(
            student_code="admin001",
            password="super-secret-123",
            fullname="Admin Root",
            faculty="ADMIN",
        )

        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.check_password("super-secret-123"))

    def test_administration_syncs_staff_and_superuser_flags(self):
        user = User.objects.create(
            fullname="Managed Admin",
            faculty="FITR",
            student_code="1000000001",
            password=make_password("password123"),
        )

        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertFalse(user.auth_sync_managed)

    def test_pending_session_does_not_create_django_auth_session(self):
        user = User.objects.create(
            fullname="TwoFA Pending",
            faculty="FITR",
            student_code="1000000002",
            password=make_password("password123"),
        )
        request = RequestFactory().get("/api/login")
        SessionMiddleware(lambda req: None).process_request(request)
        request.session.save()
        request.user = AnonymousUser()

        SessionService.begin_authenticated_session(request, user)

        self.assertTrue(request.session.get("is_authenticated"))
        self.assertEqual(request.session.get("student_code"), user.student_code)
        self.assertIsNone(request.session.get("_auth_user_id"))

    def test_finalize_session_creates_django_auth_session(self):
        user = User.objects.create(
            fullname="TwoFA Completed",
            faculty="FITR",
            student_code="1000000003",
            password=make_password("password123"),
        )
        request = RequestFactory().get("/api/login")
        SessionMiddleware(lambda req: None).process_request(request)
        request.session.save()
        request.user = AnonymousUser()

        SessionService.finalize_authenticated_session(request, user)

        self.assertEqual(request.session.get("_auth_user_id"), str(user.pk))
        self.assertEqual(
            request.session.get("_auth_user_backend"),
            "django.contrib.auth.backends.ModelBackend",
        )
        self.assertTrue(request.session.get("twofa_verified"))

        Administration.objects.create(administrator=user, is_active=True)
        user.refresh_from_db()

        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.auth_sync_managed)

        Administration.objects.filter(administrator=user).delete()
        user.refresh_from_db()

        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertFalse(user.auth_sync_managed)


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
        self.assertIn("Свиридович Павел, выполнен успешный вход в аккаунт Бентум.", sent_text)
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
