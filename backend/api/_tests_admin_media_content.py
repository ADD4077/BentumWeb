from ._tests_common import *


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

    def test_admin_ban_requires_csrf_token_when_checks_are_enforced(self):
        csrf_client = Client(enforce_csrf_checks=True)
        session = csrf_client.session
        session["is_authenticated"] = True
        session["student_code"] = self.admin_user.student_code
        session.save()

        response = csrf_client.post(
            "/api/admin/users/ban",
            data=f'{{"user_id":{self.regular_user.id},"reason":"Violation","duration":7}}',
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)
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

    def test_non_admin_cannot_access_admin_activity(self):
        other_client = Client()
        session = other_client.session
        session["is_authenticated"] = True
        session["student_code"] = self.regular_user.student_code
        session.save()

        response = other_client.get("/api/admin/activity")

        self.assertEqual(response.status_code, 403)

    def test_admin_can_fetch_content_sync_status(self):
        BackgroundJob.objects.create(
            job_type=BackgroundJobType.SCHEDULE_FULL_SYNC,
            priority=BackgroundJob.PRIORITY_LOW,
            status=BackgroundJob.STATUS_PENDING,
            available_at=timezone.now(),
        )

        response = self.client.get("/api/admin/content-sync-status")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertIn("schedule", payload["content_sync"])
        self.assertIn("news", payload["content_sync"])
        self.assertIn("literature", payload["content_sync"])
        self.assertEqual(
            payload["content_sync"]["schedule"]["job_type"],
            BackgroundJobType.SCHEDULE_FULL_SYNC,
        )

    def test_admin_activity_returns_paginated_items(self):
        for index in range(12):
            ActivityEvent.objects.create(
                event_type=ActivityEvent.EVENT_TWOFA_ENABLED,
                user=self.regular_user,
                actor=self.admin_user,
                details=f"security event {index}",
                metadata={"details": f"security event {index}"},
            )

        response = self.client.get(
            "/api/admin/activity",
            {"page": 2, "page_size": 10, "event_type": ActivityEvent.EVENT_TWOFA_ENABLED},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertEqual(payload["total"], 12)
        self.assertEqual(payload["page"], 2)
        self.assertEqual(payload["total_pages"], 2)
        self.assertEqual(len(payload["items"]), 2)

    def test_admin_can_appoint_and_remove_administrator(self):
        target_user = User.objects.create(
            fullname="Future Admin",
            faculty="IPF",
            student_code="1111111111",
            password=make_password("password123"),
        )

        appoint_response = self.client.post(
            "/api/admin/appoint",
            data=f'{{"student_code":"{target_user.student_code}","notes":"trusted"}}',
            content_type="application/json",
        )

        self.assertEqual(appoint_response.status_code, 200)
        appoint_payload = appoint_response.json()
        self.assertTrue(appoint_payload["success"])
        self.assertTrue(Administration.objects.filter(administrator=target_user, is_active=True).exists())

        remove_response = self.client.post(
            "/api/admin/remove",
            data=f'{{"student_code":"{target_user.student_code}"}}',
            content_type="application/json",
        )

        self.assertEqual(remove_response.status_code, 200)
        self.assertTrue(remove_response.json()["success"])
        self.assertFalse(Administration.objects.filter(administrator=target_user, is_active=True).exists())

    def test_admin_can_fetch_administrator_lists_and_history(self):
        target_user = User.objects.create(
            fullname="Listed Admin",
            faculty="FES",
            student_code="2222222222",
            password=make_password("password123"),
        )
        Administration.objects.create(
            administrator=target_user,
            appointed_by=self.admin_user,
            notes="listed",
        )

        list_response = self.client.get("/api/admin/list", {"page": 1, "per_page": 10})
        self.assertEqual(list_response.status_code, 200)
        list_payload = list_response.json()
        self.assertTrue(list_payload["success"])
        self.assertGreaterEqual(list_payload["pagination"]["total_items"], 2)

        history_response = self.client.get("/api/admin/history", {"student_code": target_user.student_code})
        self.assertEqual(history_response.status_code, 200)
        history_payload = history_response.json()
        self.assertTrue(history_payload["success"])
        self.assertEqual(history_payload["total"], 1)
        self.assertEqual(history_payload["history"][0]["administrator"]["student_code"], target_user.student_code)


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
        self.assertNotIn("session_key", sessions_payload["sessions"][0])

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

    def test_user_by_code_requires_authentication(self):
        response = self.client.get(f"/api/user/by-code/{self.user.student_code}")

        self.assertEqual(response.status_code, 401)

    def test_authenticated_user_by_code_omits_sensitive_fields(self):
        session = self.client.session
        session["is_authenticated"] = True
        session["student_code"] = self.user.student_code
        session.save()

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
        NewsItem.objects.create(
            title="Первая новость",
            link="https://example.com/1",
            date="2026-04-01",
            timestamp=200,
            summary="Кратко 1",
            tags="#БНТУ",
            image_url="https://example.com/1.jpg",
            reading_time=5,
        )
        NewsItem.objects.create(
            title="Вторая новость",
            link="https://example.com/2",
            date="2026-04-02",
            timestamp=100,
            summary="Кратко 2",
            tags="#Спорт",
            image_url="https://example.com/2.jpg",
            reading_time=7,
        )

        response = self.client.get("/api/news", {"page": 1, "page_size": 6, "sort": "date_desc"})

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertEqual(payload["total"], 2)
        self.assertEqual(len(payload["items"]), 2)
        self.assertEqual(payload["items"][0]["title"], "Первая новость")

    def test_literature_endpoint_returns_items(self):
        from api.content_parser_service import LITERATURE_TOP_LEVEL_SECTIONS

        LiteratureItem.objects.create(
            source_id=1,
            handle="12345/1",
            title="Р’С‹СЃС€Р°СЏ РјР°С‚РµРјР°С‚РёРєР°",
            faculty="Р¤РРўР ",
            category=next(iter(LITERATURE_TOP_LEVEL_SECTIONS.keys())),
            authors="РРІР°РЅ РРІР°РЅРѕРІ",
            publishing_date="2024",
            description="РЈС‡РµР±РЅРѕРµ РїРѕСЃРѕР±РёРµ",
            image_url="https://example.com/book.jpg",
            download_size="12 MB",
            download_link="https://example.com/book.pdf",
        )

        response = self.client.get("/api/literature", {"page": 1, "page_size": 6, "sort": "title_asc"})

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertEqual(payload["total"], 1)
        self.assertEqual(payload["items"][0]["title"], LiteratureItem.objects.first().title)

    def test_schedule_requires_authentication(self):
        response = self.client.get("/api/schedule")
        self.assertEqual(response.status_code, 401)

    def test_schedule_returns_group_schedule_for_authenticated_user(self):
        session = self.client.session
        session["is_authenticated"] = True
        session["student_code"] = self.user.student_code
        session.save()

        ScheduleEntry.objects.create(
            group_number="12345678",
            week=1,
            day="monday",
            time="09:00",
            matter="РњР°С‚РµРјР°С‚РёРєР°",
            frame="Р›РµРєС†РёСЏ",
            teacher="РРІР°РЅРѕРІ Р.Р.",
            classroom="101",
        )
        ScheduleEntry.objects.create(
            group_number="12345678",
            week=0,
            day="monday",
            time="11:00",
            matter="Р¤РёР·РёРєР°",
            frame="РџСЂР°РєС‚РёРєР°",
            teacher="РџРµС‚СЂРѕРІ Рџ.Рџ.",
            classroom="202",
        )

        response = self.client.get("/api/schedule")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertEqual(payload["student_code"], self.user.student_code)
        self.assertIn("monday", payload["schedule"])
        self.assertIn("upper", payload["schedule"]["monday"])
        self.assertEqual(payload["schedule"]["monday"]["upper"][0]["subject"], ScheduleEntry.objects.filter(group_number="12345678", week=1).first().matter)

    def test_schedule_returns_404_when_no_rows_found(self):
        session = self.client.session
        session["is_authenticated"] = True
        session["student_code"] = self.user.student_code
        session.save()

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


    def test_schedule_missing_group_returns_404_without_side_effect_jobs(self):
        session = self.client.session
        session["is_authenticated"] = True
        session["student_code"] = self.user.student_code
        session.save()

        response = self.client.get("/api/schedule")

        self.assertEqual(response.status_code, 404)
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


class HealthEndpointTests(TestCase):
    def test_health_check_does_not_expose_internal_counts(self):
        response = self.client.get("/api/health")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "healthy")
        self.assertNotIn("users_count", payload)
        self.assertNotIn("method", payload)

    @patch("api.common_views.connection.ensure_connection", side_effect=Exception("database secret details"))
    def test_health_check_does_not_expose_internal_errors(self, _ensure_connection):
        response = self.client.get("/api/health")

        self.assertEqual(response.status_code, 500)
        payload = response.json()
        self.assertEqual(payload["status"], "unhealthy")
        self.assertNotIn("error", payload)


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
