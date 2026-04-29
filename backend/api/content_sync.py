import sqlite3
from pathlib import Path

from django.conf import settings
from django.db import transaction

from .models import LiteratureItem, NewsItem, ScheduleEntry


class ContentSyncService:
    """Импортирует данные, собранные консольным парсером, в MySQL-модели Django."""

    def __init__(self):
        base_dir = Path(settings.BASE_DIR)
        self.literature_db = base_dir / "books" / "literature.db"
        self.news_db = base_dir / "news" / "times_news.db"
        self.schedule_db = base_dir / "schedules" / "schedules.db"

    def _fetch_rows(self, db_path: Path, query: str):
        if not db_path.exists():
            raise FileNotFoundError(f"SQLite database not found: {db_path}")

        with sqlite3.connect(db_path) as connection:
            cursor = connection.cursor()
            cursor.execute(query)
            return cursor.fetchall()

    def import_literature(self) -> int:
        rows = self._fetch_rows(
            self.literature_db,
            """
            SELECT title, faculty, category, authors, publishing_date,
                   description, image_url, download_size, download_link
            FROM literature
            """,
        )

        items = [
            LiteratureItem(
                title=title or "",
                faculty=faculty or "",
                category=category or "",
                authors=authors or "",
                publishing_date=publishing_date or "",
                description=description or "",
                image_url=image_url or "",
                download_size=download_size or "",
                download_link=download_link or "",
            )
            for title, faculty, category, authors, publishing_date, description, image_url, download_size, download_link in rows
        ]

        with transaction.atomic():
            LiteratureItem.objects.all().delete()
            if items:
                LiteratureItem.objects.bulk_create(items, batch_size=500)

        return len(items)

    def import_news(self) -> int:
        rows = self._fetch_rows(
            self.news_db,
            """
            SELECT title, link, date, timestamp, summary, tags, image_url, reading_time
            FROM news
            """,
        )

        items = [
            NewsItem(
                title=title or "",
                link=link or "",
                date=date or "",
                timestamp=int(timestamp or 0),
                summary=summary or "",
                tags=tags or "",
                image_url=image_url or "",
                reading_time=int(reading_time or 5),
            )
            for title, link, date, timestamp, summary, tags, image_url, reading_time in rows
        ]

        with transaction.atomic():
            NewsItem.objects.all().delete()
            if items:
                NewsItem.objects.bulk_create(items, batch_size=500)

        return len(items)

    def import_schedule(self) -> int:
        rows = self._fetch_rows(
            self.schedule_db,
            """
            SELECT group_number, week, day, time, matter, teacher, frame, classroom
            FROM schedules
            """,
        )

        items = [
            ScheduleEntry(
                group_number=group_number or "",
                week=int(week or 0),
                day=day or "",
                time=time or "",
                matter=matter or "",
                teacher=teacher or "",
                frame=frame or "",
                classroom=classroom or "",
            )
            for group_number, week, day, time, matter, teacher, frame, classroom in rows
        ]

        with transaction.atomic():
            ScheduleEntry.objects.all().delete()
            if items:
                ScheduleEntry.objects.bulk_create(items, batch_size=1000)

        return len(items)
