from ._tests_common import *


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


class SupportThreadReplyTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client()
        self.user = User.objects.create(
            fullname="Support User",
            faculty="IPF",
            student_code="2000000001",
            password="hashed-password",
        )
        self.moderator = User.objects.create(
            fullname="Moderator",
            faculty="ADMIN",
            student_code="2000000002",
            password="hashed-password",
            role=User.ROLE_MODERATOR,
        )
        self.thread = SupportThread.objects.create(
            created_by=self.user,
            assigned_moderator=self.moderator,
            subject="Need help",
            request_type=SupportThread.TYPE_SUPPORT,
            status=SupportThread.STATUS_ANSWERED,
        )
        SupportMessage.objects.create(
            thread=self.thread,
            author=self.user,
            body="Initial request",
            is_moderator_reply=False,
        )
        SupportMessage.objects.create(
            thread=self.thread,
            author=self.moderator,
            body="Moderator answer",
            is_moderator_reply=True,
        )

        session = self.client.session
        session["is_authenticated"] = True
        session["student_code"] = self.user.student_code
        session.save()

    def test_user_can_reply_to_own_open_thread(self):
        response = self.client.post(
            f"/api/support/my/threads/{self.thread.id}/reply",
            data='{"message":"Thanks, I have more details"}',
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])

        self.thread.refresh_from_db()
        self.assertEqual(self.thread.status, SupportThread.STATUS_OPEN)
        self.assertEqual(self.thread.messages.count(), 3)
        latest_message = self.thread.messages.order_by("-created_at").first()
        self.assertEqual(latest_message.body, "Thanks, I have more details")
        self.assertFalse(latest_message.is_moderator_reply)

    def test_user_cannot_reply_to_closed_thread(self):
        self.thread.status = SupportThread.STATUS_CLOSED
        self.thread.save(update_fields=["status"])

        response = self.client.post(
            f"/api/support/my/threads/{self.thread.id}/reply",
            data='{"message":"Please reopen"}',
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 409)
        self.assertFalse(response.json()["success"])
        self.assertEqual(self.thread.messages.count(), 2)

    def test_user_reply_rate_limit_blocks_immediate_repeat(self):
        first_response = self.client.post(
            f"/api/support/my/threads/{self.thread.id}/reply",
            data='{"message":"First follow-up"}',
            content_type="application/json",
        )
        second_response = self.client.post(
            f"/api/support/my/threads/{self.thread.id}/reply",
            data='{"message":"Second follow-up"}',
            content_type="application/json",
        )

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(second_response.status_code, 429)
        self.assertFalse(second_response.json()["success"])
        self.assertIn("retry_after", second_response.json())


class UserNotificationTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client()
        self.user = User.objects.create(
            fullname="Notification User",
            faculty="IPF",
            student_code="3000000001",
            password="hashed-password",
        )
        self.moderator = User.objects.create(
            fullname="Notification Moderator",
            faculty="ADMIN",
            student_code="3000000002",
            password="hashed-password",
            role=User.ROLE_MODERATOR,
        )
        self.thread = SupportThread.objects.create(
            created_by=self.user,
            subject="Need help",
            request_type=SupportThread.TYPE_SUPPORT,
            status=SupportThread.STATUS_OPEN,
        )

    def _authorize(self, student_code):
        session = self.client.session
        session["is_authenticated"] = True
        session["student_code"] = student_code
        session.save()

    def test_recent_notifications_endpoint_returns_latest_three(self):
        for index in range(4):
            UserNotification.objects.create(
                user=self.user,
                notification_type=UserNotification.TYPE_LOGIN_SUCCESS,
                title=f"Login #{index}",
                body="ok",
            )

        self._authorize(self.user.student_code)
        response = self.client.get("/api/notifications/recent")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertEqual(len(payload["notifications"]), 3)
        self.assertEqual(payload["notifications"][0]["title"], "Login #3")

    @patch("api.support.views.telegram_binding_service.send_user_notification_sync")
    def test_support_reply_creates_in_app_notification(self, _telegram_mock):
        self._authorize(self.moderator.student_code)

        response = self.client.post(
            f"/api/support/moder/threads/{self.thread.id}/reply",
            data='{"message":"Moderator response"}',
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        notification = UserNotification.objects.filter(user=self.user).latest("created_at")
        self.assertEqual(notification.notification_type, UserNotification.TYPE_SUPPORT_REPLY)
        self.assertEqual(notification.metadata["thread_id"], self.thread.id)


class SupportDebugEndpointTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()

    @override_settings(DEBUG=True, TELEGRAM_INTERNAL_API_TOKEN="test-debug-token")
    def test_test_notification_requires_internal_token_when_configured(self):
        forbidden_request = self.factory.get("/api/support/test-notification")
        forbidden_request.META["REMOTE_ADDR"] = "203.0.113.10"
        forbidden_response = support_views.test_new_user_notification(forbidden_request)
        self.assertEqual(forbidden_response.status_code, 403)

        with patch(
            "api.support.views.UserNotificationService.test_connection",
            return_value={"success": True, "message": "ok"},
        ) as connection_mock:
            allowed_request = self.factory.get(
                "/api/support/test-notification",
                HTTP_X_INTERNAL_TOKEN="test-debug-token",
            )
            allowed_request.META["REMOTE_ADDR"] = "203.0.113.10"
            allowed_response = support_views.test_new_user_notification(allowed_request)

        self.assertEqual(allowed_response.status_code, 200)
        self.assertTrue(json.loads(allowed_response.content)["success"])
        connection_mock.assert_called_once()

    @override_settings(DEBUG=True, TELEGRAM_INTERNAL_API_TOKEN="test-debug-token")
    def test_send_new_user_notification_requires_internal_token_when_configured(self):
        forbidden_request = self.factory.post(
            "/api/support/notify",
            data='{"fullname":"Test User","student_code":"1234567890"}',
            content_type="application/json",
        )
        forbidden_request.META["REMOTE_ADDR"] = "203.0.113.10"
        forbidden_response = support_views.send_new_user_notification(forbidden_request)
        self.assertEqual(forbidden_response.status_code, 403)

        allowed_request = self.factory.post(
            "/api/support/notify",
            data='{"fullname":"Test User","student_code":"1234567890"}',
            content_type="application/json",
            HTTP_X_INTERNAL_TOKEN="test-debug-token",
        )
        allowed_request.META["REMOTE_ADDR"] = "203.0.113.10"
        allowed_response = support_views.send_new_user_notification(allowed_request)

        self.assertEqual(allowed_response.status_code, 200)
        self.assertTrue(json.loads(allowed_response.content)["success"])
        self.assertTrue(
            BackgroundJob.objects.filter(job_type=BackgroundJobType.NEW_USER_NOTIFICATION).exists()
        )
