from ._tests_common import *


class BackgroundJobTests(TestCase):
    def test_high_priority_jobs_run_before_low_priority_jobs(self):
        high_job = BackgroundJobService.enqueue(BackgroundJobType.SUPPORT_REQUEST_NOTIFICATION, {"user_data": {}, "message": "x"}, priority=BackgroundJob.PRIORITY_HIGH)
        low_job = BackgroundJobService.enqueue(BackgroundJobType.SCHEDULE_FULL_SYNC, {}, priority=BackgroundJob.PRIORITY_LOW)

        reserved = BackgroundJobService._reserve_job()

        self.assertEqual(reserved.id, high_job.id)
        low_job.refresh_from_db()
        self.assertEqual(low_job.status, BackgroundJob.STATUS_PENDING)

    def test_enqueue_once_reuses_active_job_key(self):
        first_job = BackgroundJobService.enqueue_once(
            BackgroundJobType.NEWS_INCREMENTAL_SYNC,
            {},
            job_key="news-sync:active",
        )
        second_job = BackgroundJobService.enqueue_once(
            BackgroundJobType.NEWS_INCREMENTAL_SYNC,
            {},
            job_key="news-sync:active",
        )

        self.assertEqual(first_job.id, second_job.id)
        self.assertEqual(BackgroundJob.objects.count(), 1)

    def test_failed_job_error_redacts_sensitive_values(self):
        job = BackgroundJobService.enqueue(BackgroundJobType.NEWS_BOOTSTRAP, {})
        error = RuntimeError("failed url=https://example.test/?token=secret-token")

        BackgroundJobService._mark_failed(job, error)

        job.refresh_from_db()
        self.assertIn("RuntimeError", job.last_error)
        self.assertIn("token=[redacted]", job.last_error)
        self.assertNotIn("secret-token", job.last_error)

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

    def test_schedule_content_jobs_starts_with_schedule_bootstrap_when_all_content_is_empty(self):
        BackgroundJobService.schedule_content_jobs()

        self.assertTrue(
            BackgroundJob.objects.filter(job_type=BackgroundJobType.SCHEDULE_FULL_SYNC).exists()
        )
        self.assertFalse(
            BackgroundJob.objects.filter(job_type=BackgroundJobType.NEWS_BOOTSTRAP).exists()
        )
        self.assertFalse(
            BackgroundJob.objects.filter(job_type=BackgroundJobType.LITERATURE_BOOTSTRAP).exists()
        )

    def test_schedule_content_jobs_enqueues_incremental_news_when_news_exist(self):
        ScheduleEntry.objects.create(
            group_number="10903525",
            week=0,
            day="Monday",
            time="08:00",
            matter="Math",
        )
        LiteratureItem.objects.create(
            source_id=101,
            handle="12345/101",
            title="Existing literature",
        )
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

    def test_schedule_content_jobs_moves_to_news_bootstrap_after_schedule_exists(self):
        ScheduleEntry.objects.create(
            group_number="10903525",
            week=0,
            day="Monday",
            time="08:00",
            matter="Math",
        )

        BackgroundJobService.schedule_content_jobs()

        self.assertTrue(
            BackgroundJob.objects.filter(job_type=BackgroundJobType.NEWS_BOOTSTRAP).exists()
        )
        self.assertFalse(
            BackgroundJob.objects.filter(job_type=BackgroundJobType.LITERATURE_BOOTSTRAP).exists()
        )

    def test_schedule_content_jobs_moves_to_literature_bootstrap_after_schedule_and_news_exist(self):
        ScheduleEntry.objects.create(
            group_number="10903525",
            week=0,
            day="Monday",
            time="08:00",
            matter="Math",
        )
        NewsItem.objects.create(
            title="Existing News",
            link="https://times.bntu.by/news/existing",
            date="2026-04-21",
            timestamp=123456789,
            summary="summary",
            tags="#Р‘РќРўРЈ",
            image_url="",
            reading_time=5,
        )

        BackgroundJobService.schedule_content_jobs()

        self.assertTrue(
            BackgroundJob.objects.filter(job_type=BackgroundJobType.LITERATURE_BOOTSTRAP).exists()
        )

    def test_schedule_content_jobs_moves_to_literature_after_news_bootstrap_failed(self):
        ScheduleEntry.objects.create(
            group_number="10903525",
            week=0,
            day="Monday",
            time="08:00",
            matter="Math",
        )
        BackgroundJob.objects.create(
            job_type=BackgroundJobType.NEWS_BOOTSTRAP,
            priority=BackgroundJob.PRIORITY_LOW,
            status=BackgroundJob.STATUS_FAILED,
            attempts=3,
            max_attempts=3,
            available_at=timezone.now(),
            finished_at=timezone.now(),
        )

        BackgroundJobService.schedule_content_jobs()

        self.assertTrue(
            BackgroundJob.objects.filter(job_type=BackgroundJobType.LITERATURE_BOOTSTRAP).exists()
        )

    def test_schedule_content_jobs_enqueues_incremental_literature_when_literature_exists(self):
        ScheduleEntry.objects.create(
            group_number="10903525",
            week=0,
            day="Monday",
            time="08:00",
            matter="Math",
        )
        NewsItem.objects.create(
            title="Existing News",
            link="https://times.bntu.by/news/existing",
            date="2026-04-21",
            timestamp=123456789,
            summary="summary",
            tags="#Р‘РќРўРЈ",
            image_url="",
            reading_time=5,
        )
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

    def test_get_content_sync_status_reports_latest_job_per_content_type(self):
        ScheduleEntry.objects.create(
            group_number="10903525",
            week=0,
            day="Monday",
            time="08:00",
            matter="Math",
        )
        NewsItem.objects.create(
            title="Existing News",
            link="https://times.bntu.by/news/existing",
            date="2026-04-21",
            timestamp=123456789,
            summary="summary",
            tags="#Р‘РќРўРЈ",
            image_url="",
            reading_time=5,
        )
        BackgroundJob.objects.create(
            job_type=BackgroundJobType.SCHEDULE_FULL_SYNC,
            priority=BackgroundJob.PRIORITY_LOW,
            status=BackgroundJob.STATUS_COMPLETED,
            attempts=1,
            max_attempts=3,
            finished_at=timezone.now(),
            available_at=timezone.now(),
        )
        BackgroundJob.objects.create(
            job_type=BackgroundJobType.NEWS_INCREMENTAL_SYNC,
            priority=BackgroundJob.PRIORITY_MEDIUM,
            status=BackgroundJob.STATUS_RUNNING,
            attempts=1,
            max_attempts=3,
            started_at=timezone.now(),
            available_at=timezone.now(),
        )

        content_sync = BackgroundJobService.get_content_sync_status()

        self.assertEqual(content_sync["schedule"]["status"], BackgroundJob.STATUS_COMPLETED)
        self.assertEqual(content_sync["schedule"]["records_count"], 1)
        self.assertEqual(content_sync["news"]["status"], BackgroundJob.STATUS_RUNNING)
        self.assertEqual(content_sync["literature"]["status"], "idle")


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

    def test_sync_news_bootstrap_raises_when_empty_on_initial_import(self):
        async def fake_collect():
            return []

        with patch.object(self.service, "_collect_news_bootstrap", side_effect=fake_collect):
            with self.assertRaises(RuntimeError):
                self.service.sync_news_bootstrap()

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

    def test_sync_schedule_keeps_existing_schedule_when_source_is_empty(self):
        ScheduleEntry.objects.create(
            group_number="10903525",
            week=0,
            day="Понедельник",
            time="08:00",
            matter="История",
        )

        async def fake_collect():
            return []

        with patch.object(self.service, "_collect_schedule", side_effect=fake_collect):
            created = self.service.sync_schedule()

        self.assertEqual(created, 0)
        self.assertEqual(ScheduleEntry.objects.count(), 1)

    def test_sync_schedule_keeps_existing_schedule_when_upstream_is_temporarily_unreachable(self):
        ScheduleEntry.objects.create(
            group_number="10903525",
            week=0,
            day="РџРѕРЅРµРґРµР»СЊРЅРёРє",
            time="08:00",
            matter="РСЃС‚РѕСЂРёСЏ",
        )

        async def failing_collect():
            raise aiohttp.ClientConnectorError(
                connection_key=None,
                os_error=ConnectionRefusedError(111, "Connect call failed"),
            )

        with patch.object(self.service, "_collect_schedule", side_effect=failing_collect):
            created = self.service.sync_schedule()

        self.assertEqual(created, 0)
        self.assertEqual(ScheduleEntry.objects.count(), 1)

    @override_settings(SCHEDULE_SYNC_MIN_EXISTING_RATIO=0.5, SCHEDULE_SYNC_MIN_ENTRIES=1)
    def test_sync_schedule_rejects_suspicious_partial_update(self):
        for index in range(10):
            ScheduleEntry.objects.create(
                group_number=f"109035{index:02d}",
                week=0,
                day="Понедельник",
                time="08:00",
                matter="История",
            )

        async def fake_collect():
            return [
                {
                    "group_number": "10903525",
                    "week": 0,
                    "day": "Понедельник",
                    "time": "08:00",
                    "matter": "История",
                    "teacher": "",
                    "frame": "",
                    "classroom": "",
                },
                {
                    "group_number": "10903526",
                    "week": 0,
                    "day": "Вторник",
                    "time": "09:45",
                    "matter": "Математика",
                    "teacher": "",
                    "frame": "",
                    "classroom": "",
                },
            ]

        with patch.object(self.service, "_collect_schedule", side_effect=fake_collect):
            with self.assertRaises(RuntimeError):
                self.service.sync_schedule()

        self.assertEqual(ScheduleEntry.objects.count(), 10)

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

    def test_sync_literature_incremental_uses_incremental_async_flow(self):
        LiteratureItem.objects.create(source_id=300, handle="12345/300", title="Known")

        async def fake_incremental(existing_source_ids):
            self.assertEqual(existing_source_ids, {300})
            return 7

        with patch.object(self.service, "_sync_literature_incremental_async", side_effect=fake_incremental) as incremental_mock:
            created = self.service.sync_literature_incremental()

        self.assertEqual(created, 7)
        incremental_mock.assert_called_once()

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
