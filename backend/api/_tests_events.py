from ._tests_common import *
from api.models import Event, EventParticipation


class EventEndpointTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.chair = User.objects.create(
            fullname="Chair Person",
            faculty="IPF",
            student_code="1000000001",
            password=make_password("password123"),
            role=User.ROLE_CHAIRPERSON,
        )
        self.student = User.objects.create(
            fullname="Student User",
            faculty="FITR",
            student_code="1000000002",
            password=make_password("password123"),
        )

    def _auth(self, user):
        session = self.client.session
        session["is_authenticated"] = True
        session["student_code"] = user.student_code
        session.save()

    def _make_banner_upload(self, name="event.png", size=(1200, 675), color=(16, 185, 129)):
        buffer = io.BytesIO()
        image = Image.new("RGB", size, color)
        image.save(buffer, format="PNG")
        return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")

    def test_public_events_list_returns_items(self):
        event = Event.objects.create(
            title="Open Day",
            description="University open day",
            starts_at=timezone.now() + timedelta(days=2),
            max_participants=10,
            created_by=self.chair,
        )
        EventParticipation.objects.create(event=event, user=self.student)

        response = self.client.get("/api/events/", {"page": 1, "page_size": 6})

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["success"])
        self.assertEqual(payload["total"], 1)
        self.assertEqual(payload["items"][0]["participant_ratio"], "1/10")

    def test_chairperson_can_create_event(self):
        self._auth(self.chair)
        media_root = tempfile.mkdtemp(prefix="bentum-event-media-")
        try:
            with override_settings(MEDIA_ROOT=media_root):
                response = self.client.post(
                    "/api/events/",
                    data={
                        "title": "Hackathon",
                        "description": "Night coding event",
                        "starts_at": (timezone.now() + timedelta(days=3)).isoformat(),
                        "max_participants": "25",
                        "banner": self._make_banner_upload(),
                    },
                )

            self.assertEqual(response.status_code, 201)
            payload = response.json()
            self.assertTrue(payload["success"])
            self.assertTrue(Event.objects.filter(title="Hackathon").exists())
            self.assertTrue(payload["item"]["banner_url"])
        finally:
            shutil.rmtree(media_root, ignore_errors=True)

    def test_student_cannot_create_event(self):
        self._auth(self.student)
        response = self.client.post(
            "/api/events/",
            data={
                "title": "Blocked event",
                "description": "No permissions",
                "starts_at": (timezone.now() + timedelta(days=1)).isoformat(),
                "max_participants": "5",
            },
        )

        self.assertEqual(response.status_code, 403)
        self.assertFalse(response.json()["success"])

    def test_student_can_join_and_leave_event(self):
        event = Event.objects.create(
            title="Practice event",
            description="Joinable event",
            starts_at=timezone.now() + timedelta(days=1),
            max_participants=3,
            created_by=self.chair,
        )
        self._auth(self.student)

        join_response = self.client.post(
            f"/api/events/{event.id}/participation",
            data="{}",
            content_type="application/json",
        )
        self.assertEqual(join_response.status_code, 200)
        self.assertTrue(join_response.json()["success"])
        self.assertTrue(EventParticipation.objects.filter(event=event, user=self.student).exists())

        leave_response = self.client.post(
            f"/api/events/{event.id}/participation",
            data="{}",
            content_type="application/json",
        )
        self.assertEqual(leave_response.status_code, 200)
        self.assertTrue(leave_response.json()["success"])
        self.assertFalse(EventParticipation.objects.filter(event=event, user=self.student).exists())

    def test_event_in_progress_is_derived_from_starts_at(self):
        event = Event.objects.create(
            title="Running event",
            description="Already started",
            starts_at=timezone.now() - timedelta(minutes=10),
            max_participants=10,
            created_by=self.chair,
        )

        response = self.client.get("/api/events/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["items"][0]["status"], Event.STATUS_IN_PROGRESS)

    def test_chair_can_complete_in_progress_event(self):
        self._auth(self.chair)
        event = Event.objects.create(
            title="Running event",
            description="Already started",
            starts_at=timezone.now() - timedelta(minutes=10),
            max_participants=10,
            created_by=self.chair,
        )

        response = self.client.post(
            f"/api/events/{event.id}/complete",
            data="{}",
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        event.refresh_from_db()
        self.assertEqual(event.status, Event.STATUS_COMPLETED)

    def test_chair_can_remove_participant(self):
        self._auth(self.chair)
        event = Event.objects.create(
            title="Practice event",
            description="Joinable event",
            starts_at=timezone.now() + timedelta(days=1),
            max_participants=3,
            created_by=self.chair,
        )
        participation = EventParticipation.objects.create(event=event, user=self.student)

        response = self.client.delete(f"/api/events/{event.id}/participants/{participation.id}")

        self.assertEqual(response.status_code, 200)
        self.assertFalse(EventParticipation.objects.filter(id=participation.id).exists())

    def test_chair_can_save_attendance_for_in_progress_event(self):
        self._auth(self.chair)
        event = Event.objects.create(
            title="Running event",
            description="Already started",
            starts_at=timezone.now() - timedelta(minutes=10),
            max_participants=10,
            created_by=self.chair,
        )
        participation = EventParticipation.objects.create(event=event, user=self.student)

        response = self.client.post(
            f"/api/events/{event.id}/attendance",
            data=json.dumps({"attended_participant_ids": [participation.id]}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        participation.refresh_from_db()
        self.assertTrue(participation.attended)
        self.assertIsNotNone(participation.attended_at)
