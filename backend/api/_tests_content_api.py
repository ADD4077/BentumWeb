from ._tests_common import LiteratureItem, NewsItem, TestCase


class ContentApiEndpointTests(TestCase):
    def test_news_endpoint_filters_by_category_and_search(self):
        NewsItem.objects.create(
            title="Спортивная новость",
            link="https://example.com/sport",
            date="2026-04-03",
            timestamp=300,
            summary="Победа команды",
            tags="#Спорт",
            image_url="https://example.com/sport.jpg",
            reading_time=4,
        )
        NewsItem.objects.create(
            title="Учебная новость",
            link="https://example.com/study",
            date="2026-04-04",
            timestamp=400,
            summary="О студентах",
            tags="#Студенты БНТУ",
            image_url="https://example.com/study.jpg",
            reading_time=3,
        )

        response = self.client.get("/api/news", {"category": "sports", "search": "Победа"})

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["total"], 1)
        self.assertEqual(payload["items"][0]["title"], "Спортивная новость")
        self.assertEqual(payload["items"][0]["category"], "sports")

    def test_literature_endpoint_filters_by_search_and_category(self):
        from api.content_parser_service import LITERATURE_TOP_LEVEL_SECTIONS

        categories = list(LITERATURE_TOP_LEVEL_SECTIONS.keys())[:2]
        LiteratureItem.objects.create(
            source_id=11,
            handle="12345/11",
            title="Геодезия для студентов",
            faculty="ФИТР",
            category=categories[0],
            authors="Автор Один",
            publishing_date="2025",
            description="Учебное пособие по геодезии",
            image_url="https://example.com/geo.jpg",
            download_size="10 MB",
            download_link="https://example.com/geo.pdf",
        )
        LiteratureItem.objects.create(
            source_id=12,
            handle="12345/12",
            title="Материал по менеджменту",
            faculty="ФИТР",
            category=categories[1],
            authors="Автор Два",
            publishing_date="2025",
            description="Учебное пособие по менеджменту",
            image_url="https://example.com/mgmt.jpg",
            download_size="12 MB",
            download_link="https://example.com/mgmt.pdf",
        )

        response = self.client.get("/api/literature", [("search", "геодезии"), ("category", categories[0])])

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["total"], 1)
        self.assertEqual(payload["items"][0]["title"], "Геодезия для студентов")
