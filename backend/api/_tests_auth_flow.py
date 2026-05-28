from ._tests_common import *
from api.telegram_binding_service import telegram_binding_service
from api.referral_service import ReferralService
from telegram_bot.services import authenticate_or_register_telegram_user


class AuthFlowEndpointTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create(
            fullname="Existing User",
            faculty="FITR",
            student_code="1234567890",
            password=make_password("password123"),
        )
        self.inviter = User.objects.create(
            fullname="Referral Owner",
            faculty="IPF",
            student_code="1090352523",
            password=make_password("password321"),
        )
        ReferralService.ensure_user_referral_code(self.inviter)

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

    def test_banned_existing_user_cannot_login(self):
        UserBan.objects.create(
            student_code=self.user.student_code,
            user_id=self.user.id,
            banned_by_id=None,
            ban_duration_seconds=3600,
            ban_reason="Policy violation",
            is_active=True,
        )

        response = self.client.post(
            "/api/save_data",
            data='{"studentCode":"1234567890","password":"password123"}',
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)
        payload = response.json()
        self.assertFalse(payload["success"])
        self.assertTrue(payload["is_banned"])
        self.assertFalse(self.client.session.get("is_authenticated", False))

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
        self.assertEqual(response.status_code, 400)

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

    @patch("api.core.views.authorize", return_value=("New Referral User", "FITR"))
    def test_registration_applies_referral_code(self, authorize_mock):
        response = self.client.post(
            "/api/save_data",
            data=(
                '{'
                '"studentCode":"1234500001",'
                '"password":"password123",'
                f'"referralCode":"{self.inviter.referral_code}"'
                '}'
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        created_user = User.objects.get(student_code="1234500001")
        self.assertEqual(created_user.referred_by_id, self.inviter.id)
        self.assertEqual(created_user.referral_source, "site")
        self.assertIsNone(payload.get("referral_warning"))
        authorize_mock.assert_called_once_with("1234500001", "password123")


class PublicProfileEndpointTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create(
            fullname="Team Member",
            faculty="FITR",
            student_code="1090352523",
            password=make_password("password123"),
        )

    def test_guest_can_fetch_public_profile_by_student_code(self):
        response = self.client.get(f"/api/user/by-code/{self.user.student_code}")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertIsNotNone(payload["user"])
        self.assertEqual(payload["user"]["student_code"], self.user.student_code)
        self.assertEqual(payload["user"]["fullname"], self.user.fullname)
        self.assertEqual(payload["user"]["faculty"], self.user.faculty)

    def test_guest_cannot_fetch_hidden_public_profile(self):
        UserSettings.objects.update_or_create(
            user=self.user,
            defaults={"show_profile_in_community": False},
        )

        response = self.client.get(f"/api/user/by-code/{self.user.student_code}")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertIsNone(payload["user"])


class TelegramBotAuthTests(TransactionTestCase):
    def setUp(self):
        self.telegram_data = {
            "id": 555001,
            "username": "bentumtester",
            "first_name": "Pavel",
            "last_name": "Tester",
        }

    def test_existing_user_can_authenticate_and_bind_telegram(self):
        user = User.objects.create(
            fullname="Existing User",
            faculty="FITR",
            student_code="1234567890",
            password=make_password("password123"),
        )

        result = asyncio.run(
            authenticate_or_register_telegram_user(
                self.telegram_data,
                student_code=user.student_code,
                password="password123",
            )
        )

        self.assertTrue(result.success)
        self.assertFalse(result.created)
        self.assertEqual(result.user.student_code, user.student_code)

        binding = telegram_binding_service.get_user_binding(user)
        self.assertIsNotNone(binding)
        self.assertEqual(binding.telegram_id, self.telegram_data["id"])
        self.assertTrue(binding.is_active)

    @patch("telegram_bot.services.authorize", return_value=("New User", "IPF"))
    def test_new_user_is_created_and_bound_from_bot(self, authorize_mock):
        result = asyncio.run(
            authenticate_or_register_telegram_user(
                self.telegram_data,
                student_code="1090352523",
                password="red-code-123",
            )
        )

        self.assertTrue(result.success)
        self.assertTrue(result.created)
        self.assertEqual(result.user.student_code, "1090352523")

        user = User.objects.get(student_code="1090352523")
        self.assertEqual(user.fullname, "New User")
        self.assertTrue(check_password("red-code-123", user.password))

        binding = telegram_binding_service.get_user_binding(user)
        self.assertIsNotNone(binding)
        self.assertEqual(binding.telegram_id, self.telegram_data["id"])
        authorize_mock.assert_called_once_with("1090352523", "red-code-123")

    @patch("telegram_bot.services.authorize", return_value=("Referred User", "IPF"))
    def test_new_user_can_register_from_bot_with_referral_code(self, authorize_mock):
        inviter = User.objects.create(
            fullname="Bot Inviter",
            faculty="FES",
            student_code="1000000001",
            password=make_password("password777"),
        )
        ReferralService.ensure_user_referral_code(inviter)

        result = asyncio.run(
            authenticate_or_register_telegram_user(
                self.telegram_data,
                student_code="1090352599",
                password="red-code-321",
                referral_code=inviter.referral_code,
            )
        )

        self.assertTrue(result.success)
        self.assertTrue(result.created)
        user = User.objects.get(student_code="1090352599")
        self.assertEqual(user.referred_by_id, inviter.id)
        self.assertEqual(user.referral_source, "telegram_bot")
        self.assertIn("рефераль", result.message.lower())
        authorize_mock.assert_called_once_with("1090352599", "red-code-321")

    def test_telegram_cannot_bind_to_different_existing_user(self):
        first_user = User.objects.create(
            fullname="First User",
            faculty="FITR",
            student_code="1234567890",
            password=make_password("password123"),
        )
        second_user = User.objects.create(
            fullname="Second User",
            faculty="IPF",
            student_code="1090352523",
            password=make_password("password456"),
        )

        ok, _ = asyncio.run(
            telegram_binding_service.bind_user_to_telegram_account_async(first_user, self.telegram_data)
        )
        self.assertTrue(ok)

        result = asyncio.run(
            authenticate_or_register_telegram_user(
                self.telegram_data,
                student_code=second_user.student_code,
                password="password456",
            )
        )

        self.assertFalse(result.success)
        self.assertIn("уже привязан", result.message.lower())
