import asyncio
import logging
from datetime import datetime, timedelta

import aiohttp
from django.conf import settings
from django.db import transaction

from .content.constants import (
    DEFAULT_HEADERS,
    FACULTY_RU,
    LITERATURE_PAGE_LIMIT,
    LITERATURE_PER_FACULTY,
    LITERATURE_REST_BASE_URL,
    LITERATURE_TOP_LEVEL_SECTIONS,
    NEWS_BASE_URL,
    SCHEDULE_FACULTIES,
    SCHEDULE_GROUP_PLACEHOLDER,
    SCHEDULE_PATTERN,
    SCHEDULE_REPLACEMENTS,
)
from .content.literature import parser as literature_parser
from .content.news import parser as news_parser
from .content.runtime import (
    allow_insecure_ssl_fallback,
    build_async_retry_policy,
    build_sync_retry_policy,
    safe_get,
)
from .content.schedule import parser as schedule_parser
from .models import LiteratureItem, NewsItem, ScheduleEntry


logger = logging.getLogger(__name__)

class BNTUContentParserService:
    NEWS_LOOKBACK_DAYS = 730
    NEWS_STOP_AFTER_STALE_PAGES = 5
    NEWS_STOP_AFTER_EMPTY_PAGES = 2
    NEWS_STOP_AFTER_REPEAT_PAGES = 2
    LITERATURE_STOP_AFTER_EMPTY_PAGES = 2
    LITERATURE_STOP_AFTER_REPEAT_PAGES = 2
    LITERATURE_INCREMENTAL_STOP_AFTER_KNOWN_PAGES = 1
    LITERATURE_REQUEST_RETRIES = 3
    LITERATURE_RETRY_DELAY_SECONDS = 0.35
    LITERATURE_MIN_BOOTSTRAP_ITEMS = 1
    LITERATURE_ITEM_CONCURRENCY = 8
    SCHEDULE_REQUEST_RETRIES = 3
    SCHEDULE_RETRY_DELAY_SECONDS = 0.5

    def __init__(self):
        self.news_threshold = datetime.now() - timedelta(days=self.NEWS_LOOKBACK_DAYS)
        self.allow_insecure_ssl = allow_insecure_ssl_fallback()
        self.default_headers = DEFAULT_HEADERS
        self.logger = logger
        self.schedule_faculties = SCHEDULE_FACULTIES
        self.schedule_pattern = SCHEDULE_PATTERN
        self.schedule_replacements = SCHEDULE_REPLACEMENTS
        self.schedule_group_placeholder = SCHEDULE_GROUP_PLACEHOLDER
        self.literature_rest_base_url = LITERATURE_REST_BASE_URL
        self.literature_origin = "https://rep.bntu.by"
        self.literature_page_limit = LITERATURE_PAGE_LIMIT
        self.literature_top_level_sections = LITERATURE_TOP_LEVEL_SECTIONS

    @staticmethod
    def _async_retry_policy(attempts, delay, retry_types):
        return build_async_retry_policy(attempts, delay, retry_types)

    @staticmethod
    def _sync_retry_policy(attempts, delay, retry_types):
        return build_sync_retry_policy(attempts, delay, retry_types)

    def sync_news(self):
        if NewsItem.objects.exists():
            return self.sync_news_incremental()
        return self.sync_news_bootstrap()

    def sync_news_bootstrap(self):
        items = asyncio.run(self._collect_news_bootstrap())
        if not items:
            if not NewsItem.objects.exists():
                raise RuntimeError("News bootstrap finished without importing any items")
            return 0

        existing_links = set(NewsItem.objects.filter(link__in=[item["link"] for item in items]).values_list("link", flat=True))
        rows = [self._build_news_item(item) for item in items if item["link"] not in existing_links]
        if rows:
            NewsItem.objects.bulk_create(rows, batch_size=200)
        elif not NewsItem.objects.exists():
            raise RuntimeError("News bootstrap finished without importing any items")
        return len(rows)

    def sync_news_incremental(self):
        existing_links = set(NewsItem.objects.values_list("link", flat=True))
        items = asyncio.run(self._collect_news_incremental(existing_links))
        if not items:
            return 0

        rows = [self._build_news_item(item) for item in items]
        if rows:
            NewsItem.objects.bulk_create(rows, batch_size=100)
        return len(rows)

    def sync_schedule(self):
        try:
            raw_entries = asyncio.run(self._collect_schedule())
        except (aiohttp.ClientError, asyncio.TimeoutError) as exc:
            if ScheduleEntry.objects.exists():
                logger.warning("Schedule sync failed due to upstream network error; keeping existing schedule: %r", exc)
                return 0
            raise RuntimeError("Schedule sync failed while fetching BNTU schedule") from exc

        entries = self._dedupe_schedule_entries(raw_entries)
        if not entries:
            logger.warning("Schedule sync returned no entries; keeping existing schedule")
            return 0

        existing_count = ScheduleEntry.objects.count()
        configured_min_entries = max(1, getattr(settings, "SCHEDULE_SYNC_MIN_ENTRIES", 1))
        existing_ratio = getattr(settings, "SCHEDULE_SYNC_MIN_EXISTING_RATIO", 0.5)
        existing_min_entries = int(existing_count * existing_ratio) if existing_count else 0
        min_entries = max(configured_min_entries, existing_min_entries)

        if len(entries) < min_entries:
            raise RuntimeError(
                "Suspicious schedule sync size: "
                f"{len(entries)} entries, expected at least {min_entries}"
            )

        with transaction.atomic():
            ScheduleEntry.objects.all().delete()
            if entries:
                ScheduleEntry.objects.bulk_create(
                    [ScheduleEntry(**entry) for entry in entries],
                    batch_size=1000,
                )
        return len(entries)

    def sync_literature(self):
        if LiteratureItem.objects.exists():
            return self.sync_literature_incremental()
        return self.sync_literature_bootstrap()

    def sync_literature_bootstrap(self, sample_per_section=None):
        existing_items = {
            item["source_id"]: item
            for item in LiteratureItem.objects.exclude(source_id__isnull=True).values(
                "id",
                "source_id",
                "category",
                "handle",
                "authors",
                "description",
                "image_url",
                "download_size",
                "download_link",
                "publishing_date",
            )
        }
        created = asyncio.run(self._sync_literature_bootstrap_async(existing_items, sample_per_section))
        if not LiteratureItem.objects.exists() and created < self.LITERATURE_MIN_BOOTSTRAP_ITEMS:
            raise RuntimeError("Literature bootstrap finished without importing any items")
        return created

    def sync_literature_incremental(self):
        existing_source_ids = set(
            LiteratureItem.objects.exclude(source_id__isnull=True).values_list("source_id", flat=True)
        )
        return asyncio.run(self._sync_literature_incremental_async(existing_source_ids))

    async def _collect_news_bootstrap(self):
        return await news_parser.collect_news_bootstrap(self)

    async def _collect_news_incremental(self, existing_links):
        return await news_parser.collect_news_incremental(self, existing_links)

    async def _collect_schedule(self):
        return await schedule_parser.collect_schedule(self)

    def _dedupe_schedule_entries(self, entries):
        return schedule_parser.dedupe_schedule_entries(entries)

    async def _collect_literature_bootstrap(self):
        return await literature_parser.collect_literature_bootstrap(self)

    async def _sync_literature_bootstrap_async(self, existing_items, sample_per_section=None):
        return await literature_parser.sync_literature_bootstrap_async(self, existing_items, sample_per_section)

    async def _sync_literature_incremental_async(self, existing_source_ids):
        return await literature_parser.sync_literature_incremental_async(self, existing_source_ids)

    def _literature_item_needs_enrichment(self, current_item):
        return literature_parser.literature_item_needs_enrichment(current_item)

    def _literature_payload_needs_document_assets(self, payload):
        return literature_parser.literature_payload_needs_document_assets(payload)

    async def _process_literature_page_item(self, session, semaphore, item, section_name, current_item):
        return await literature_parser.process_literature_page_item(self, session, semaphore, item, section_name, current_item)

    async def _collect_literature_incremental(self, existing_source_ids):
        return await literature_parser.collect_literature_incremental(self, existing_source_ids)

    def _get_news_max_page(self):
        return news_parser.get_news_max_page(self)

    async def _fetch_news_page(self, session, page):
        return await news_parser.fetch_news_page(self, session, page)

    async def _fetch_news_details(self, session, title, full_link):
        return await news_parser.fetch_news_details(self, session, title, full_link)

    def _extract_news_image(self, detail_soup):
        return news_parser.extract_news_image(detail_soup)

    def _normalize_image_url(self, src):
        return news_parser.normalize_image_url(src)

    def _extract_news_card_image(self, style_value):
        return news_parser.extract_news_card_image(style_value)

    def _build_news_payload(self, details, tags):
        return news_parser.build_news_payload(self, details, tags)

    def _build_news_listing_payload(self, item):
        return news_parser.build_news_listing_payload(self, item)

    def _build_news_item(self, item):
        return news_parser.build_news_item(item)

    def _resolve_news_month(self, month_name):
        return news_parser.resolve_news_month(month_name)

    def _parse_news_date(self, date):
        return news_parser.parse_news_date(date)

    async def _fetch_schedule_groups(self, session, endpoint):
        return await schedule_parser.fetch_schedule_groups(self, session, endpoint)

    async def _fetch_schedule_table(self, session, endpoint, group):
        return await schedule_parser.fetch_schedule_table(self, session, endpoint, group)

    def _extract_schedule_entries(self, group, soup):
        return schedule_parser.extract_schedule_entries(self, group, soup)

    async def _fetch_literature_page(self, session, offset, strict=False):
        return await literature_parser.fetch_literature_page(self, session, offset, strict=strict)

    async def _fetch_literature_collection_page(self, session, collection_id, offset):
        return await literature_parser.fetch_literature_collection_page(self, session, collection_id, offset)

    async def _fetch_literature_handle(self, session, handle, strict=False):
        return await literature_parser.fetch_literature_handle(self, session, handle, strict=strict)

    async def _fetch_literature_community_children(self, session, community_id):
        return await literature_parser.fetch_literature_community_children(self, session, community_id)

    async def _fetch_literature_community_collections(self, session, community_id):
        return await literature_parser.fetch_literature_community_collections(self, session, community_id)

    async def _collect_literature_section_collections(self, session, community):
        return await literature_parser.collect_literature_section_collections(self, session, community)

    async def _fetch_literature_metadata(self, session, item_id):
        return await literature_parser.fetch_literature_metadata(self, session, item_id)

    async def _fetch_literature_expanded(self, session, item_id):
        return await literature_parser.fetch_literature_expanded(self, session, item_id)

    async def _fetch_literature_json(self, session, url, default, strict=False):
        return await literature_parser.fetch_literature_json(self, session, url, default, strict=strict)

    async def _fetch_literature_payload(self, _session, item):
        return await literature_parser.fetch_literature_payload(self, _session, item)

    def _metadata_to_dict(self, meta_list):
        return literature_parser.metadata_to_dict(meta_list)

    def _ensure_list(self, value):
        return literature_parser.ensure_list(value)

    def _normalize_rest_link(self, value):
        return literature_parser.normalize_rest_link(self, value)

    def _pick_literature_download_bitstream(self, bitstreams):
        return literature_parser.pick_literature_download_bitstream(self, bitstreams)

    def _pick_literature_thumbnail(self, bitstreams):
        return literature_parser.pick_literature_thumbnail(self, bitstreams)

    async def _fetch_literature_document_assets(self, session, handle):
        return await literature_parser.fetch_literature_document_assets(self, session, handle)

    def _build_literature_payload(self, item, category=""):
        return literature_parser.build_literature_payload(self, item, category=category)

    def _build_literature_item(self, item):
        return literature_parser.build_literature_item(item)

    def _build_literature_update_model(self, item):
        return literature_parser.build_literature_update_model(item)

    def _safe_get(self, url, **kwargs):
        headers = kwargs.pop("headers", DEFAULT_HEADERS)
        return safe_get(url, headers=headers, timeout=10, retries=3, delay=0.35, **kwargs)

