import asyncio
import logging
import math
import re
from datetime import datetime, timedelta
from urllib.parse import quote

import aiohttp
import bs4
import requests
from asgiref.sync import sync_to_async
from django.conf import settings
from django.db import transaction

from .models import LiteratureItem, NewsItem, ScheduleEntry


logger = logging.getLogger(__name__)

NEWS_BASE_URL = "https://times.bntu.by"
LITERATURE_REST_BASE_URL = "https://rep.bntu.by/rest"
LITERATURE_PAGE_LIMIT = 50
LITERATURE_TOP_LEVEL_SECTIONS = {
    "БНТУ в фотографиях": "data/142374",
    "Внеуниверситетские публикации ученых БНТУ": "data/1008",
    "Выпускные квалификационные работы": "data/53531",
    "Графические работы": "data/72102",
    "Диссертации, авторефераты диссертаций": "data/53485",
    "Инструктивно-методические документы": "data/53783",
    "История БНТУ в публикациях": "data/53501",
    "Конкурсные и выставочные проекты": "data/92527",
    "Материалы конференций и семинаров": "data/95",
    "Монографии": "data/53149",
    "Отчеты о НИОКТР": "data/57",
    "Патенты": "data/56602",
    "Публикации работников Научной библиотеки": "data/54",
    "Сборники научных трудов": "data/14456",
    "Сериальные издания": "data/60",
    "Учебные материалы": "data/62",
}
LITERATURE_EXCLUDED_SECTION_HANDLES = {
    "data/142374",
    "data/53531",
    "data/72102",
    "data/53783",
    "data/95",
    "data/57",
    "data/56602",
    "data/53485",
}
LITERATURE_TOP_LEVEL_SECTIONS = {
    name: handle
    for name, handle in LITERATURE_TOP_LEVEL_SECTIONS.items()
    if handle not in LITERATURE_EXCLUDED_SECTION_HANDLES
}
LITERATURE_PER_FACULTY = {
    "atf": "https://rep.bntu.by/handle/data/101",
    "fgde": "https://rep.bntu.by/handle/data/82",
    "msf": "https://rep.bntu.by/handle/data/132",
    "mtf": "https://rep.bntu.by/handle/data/76",
    "fmmp": "https://rep.bntu.by/handle/data/86",
    "ef": "https://rep.bntu.by/handle/data/99",
    "fitr": "https://rep.bntu.by/handle/data/84",
    "ftug": "https://rep.bntu.by/handle/data/96",
    "ipf": "https://rep.bntu.by/handle/data/73",
    "fes": "https://rep.bntu.by/handle/data/98",
    "af": "https://rep.bntu.by/handle/data/100",
    "sf": "https://rep.bntu.by/handle/data/81",
    "psf": "https://rep.bntu.by/handle/data/77",
    "ftk": "https://rep.bntu.by/handle/data/97",
    "vtf": "https://rep.bntu.by/handle/data/70",
    "stf": "https://rep.bntu.by/handle/data/78",
    "fms": "https://rep.bntu.by/handle/data/88",
}
FACULTY_RU = {
    "atf": "АПФ",
    "fgde": "ФГДИЭ",
    "msf": "МСФ",
    "mtf": "МТФ",
    "fmmp": "ФММП",
    "ef": "ЭФ",
    "fitr": "ФИТР",
    "ftug": "ФТУГ",
    "ipf": "ИПФ",
    "fes": "ФЭС",
    "af": "АФ",
    "sf": "СФ",
    "psf": "ПСФ",
    "ftk": "ФТК",
    "vtf": "ВТФ",
    "stf": "СТФ",
    "fms": "ФМС",
}
SCHEDULE_FACULTIES = [
    "atf",
    "fgde",
    "msf",
    "mtf",
    "fmmp",
    "ef",
    "fitr",
    "ftug",
    "ipf",
    "fes",
    "af",
    "sf",
    "psf",
    "ftk",
    "vtf",
    "stf",
]
SCHEDULE_REPLACEMENTS = {"Практ": "Практ.", "Лекц": "Лекц.", "Лаб": "Лаб."}
SCHEDULE_PATTERN = re.compile(r"\(\s*(Практ|Лекц|Лаб)[^)]*\)", re.IGNORECASE)
MONTH_MAP = {
    "января": 1,
    "янв": 1,
    "февраля": 2,
    "фев": 2,
    "марта": 3,
    "мар": 3,
    "апреля": 4,
    "апр": 4,
    "мая": 5,
    "июня": 6,
    "июн": 6,
    "июля": 7,
    "июл": 7,
    "августа": 8,
    "авг": 8,
    "сентября": 9,
    "сен": 9,
    "октября": 10,
    "окт": 10,
    "ноября": 11,
    "ноя": 11,
    "декабря": 12,
    "дек": 12,
}
LATIN_TO_CYRILLIC = str.maketrans(
    {
        "a": "а",
        "c": "с",
        "e": "е",
        "k": "к",
        "m": "м",
        "o": "о",
        "p": "р",
        "t": "т",
        "x": "х",
        "y": "у",
    }
)

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/135.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ru,en;q=0.9",
}


class BNTUContentParserService:
    NEWS_LOOKBACK_DAYS = 730
    NEWS_STOP_AFTER_STALE_PAGES = 5
    NEWS_STOP_AFTER_EMPTY_PAGES = 2
    NEWS_STOP_AFTER_REPEAT_PAGES = 2
    LITERATURE_STOP_AFTER_EMPTY_PAGES = 2
    LITERATURE_STOP_AFTER_REPEAT_PAGES = 2
    LITERATURE_REQUEST_RETRIES = 3
    LITERATURE_RETRY_DELAY_SECONDS = 0.35
    LITERATURE_MIN_BOOTSTRAP_ITEMS = 1

    def __init__(self):
        self.news_threshold = datetime.now() - timedelta(days=self.NEWS_LOOKBACK_DAYS)

    def sync_news(self):
        if NewsItem.objects.exists():
            return self.sync_news_incremental()
        return self.sync_news_bootstrap()

    def sync_news_bootstrap(self):
        items = asyncio.run(self._collect_news_bootstrap())
        if not items:
            return 0

        existing_links = set(
            NewsItem.objects.filter(link__in=[item["link"] for item in items]).values_list("link", flat=True)
        )
        rows = [self._build_news_item(item) for item in items if item["link"] not in existing_links]
        if rows:
            NewsItem.objects.bulk_create(rows, batch_size=200)
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
        entries = self._dedupe_schedule_entries(asyncio.run(self._collect_schedule()))
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
        return self.sync_literature_bootstrap()

    async def _collect_news_bootstrap(self):
        connector = aiohttp.TCPConnector(limit=30, limit_per_host=10)
        timeout = aiohttp.ClientTimeout(total=30)
        collected = []
        seen_links = set()
        stale_pages = 0
        empty_pages = 0
        repeated_pages = 0
        previous_signature = None

        async with aiohttp.ClientSession(connector=connector, timeout=timeout, headers=DEFAULT_HEADERS) as session:
            page = 1
            while True:
                page_items = await self._fetch_news_page(session, page)
                page_signature = tuple(item["link"] for item in page_items[:10])
                if not page_items:
                    empty_pages += 1
                    if empty_pages >= self.NEWS_STOP_AFTER_EMPTY_PAGES:
                        return collected
                    page += 1
                    await asyncio.sleep(0.1)
                    continue

                empty_pages = 0
                if page_signature and page_signature == previous_signature:
                    repeated_pages += 1
                    if repeated_pages >= self.NEWS_STOP_AFTER_REPEAT_PAGES:
                        return collected
                else:
                    repeated_pages = 0
                previous_signature = page_signature

                candidates = []
                for item in page_items:
                    if item["link"] and item["title"] and item["link"] not in seen_links:
                        seen_links.add(item["link"])
                        candidates.append(item)

                page_recent_news = 0
                for index in range(0, len(candidates), 20):
                    batch = candidates[index:index + 20]
                    results = await asyncio.gather(
                        *[self._fetch_news_details(session, item["title"], item["link"]) for item in batch],
                        return_exceptions=True,
                    )
                    for item, result in zip(batch, results):
                        if isinstance(result, Exception):
                            continue
                        news = self._build_news_payload(result, item["tags"])
                        if not news:
                            continue
                        collected.append(news)
                        page_recent_news += 1
                    await asyncio.sleep(0.05)

                if page_recent_news == 0:
                    stale_pages += 1
                    if stale_pages >= self.NEWS_STOP_AFTER_STALE_PAGES:
                        return collected
                else:
                    stale_pages = 0
                page += 1
                await asyncio.sleep(0.1)
        return collected

    async def _collect_news_incremental(self, existing_links):
        connector = aiohttp.TCPConnector(limit=10, limit_per_host=5)
        timeout = aiohttp.ClientTimeout(total=30)
        collected = []
        empty_pages = 0
        repeated_pages = 0
        previous_signature = None

        async with aiohttp.ClientSession(connector=connector, timeout=timeout, headers=DEFAULT_HEADERS) as session:
            page = 1
            while True:
                page_items = await self._fetch_news_page(session, page)
                page_signature = tuple(item["link"] for item in page_items[:10])
                if not page_items:
                    empty_pages += 1
                    if empty_pages >= self.NEWS_STOP_AFTER_EMPTY_PAGES:
                        return collected
                    page += 1
                    await asyncio.sleep(0.05)
                    continue

                empty_pages = 0
                if page_signature and page_signature == previous_signature:
                    repeated_pages += 1
                    if repeated_pages >= self.NEWS_STOP_AFTER_REPEAT_PAGES:
                        return collected
                else:
                    repeated_pages = 0
                previous_signature = page_signature

                for item in page_items:
                    if not item["link"] or not item["title"]:
                        continue
                    if item["link"] in existing_links:
                        return collected

                    details = await self._fetch_news_details(session, item["title"], item["link"])
                    news = self._build_news_payload(details, item["tags"])
                    if not news:
                        return collected
                    collected.append(news)
                    existing_links.add(item["link"])
                page += 1
                await asyncio.sleep(0.05)
        return collected

    async def _collect_schedule(self):
        connector = aiohttp.TCPConnector(limit=40, limit_per_host=10)
        timeout = aiohttp.ClientTimeout(total=30)
        entries = []
        seen_entries = set()

        async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
            for faculty in SCHEDULE_FACULTIES:
                endpoint = f"https://bntu.by/raspisanie/{faculty}"
                groups = await self._fetch_schedule_groups(session, endpoint)
                for index in range(0, len(groups), 20):
                    batch = groups[index:index + 20]
                    results = await asyncio.gather(
                        *[self._fetch_schedule_table(session, endpoint, group) for group in batch],
                        return_exceptions=True,
                    )
                    for group, result in zip(batch, results):
                        if isinstance(result, Exception) or not result:
                            continue
                        for entry in self._extract_schedule_entries(group, result):
                            entry_key = (
                                entry["group_number"],
                                entry["week"],
                                entry["day"],
                                entry["time"],
                                entry["matter"],
                                entry["teacher"],
                                entry["frame"],
                                entry["classroom"],
                            )
                            if entry_key in seen_entries:
                                continue
                            seen_entries.add(entry_key)
                            entries.append(entry)
                    await asyncio.sleep(0.05)
                await asyncio.sleep(0.1)
        return entries

    def _dedupe_schedule_entries(self, entries):
        unique_entries = []
        seen_entries = set()
        for entry in entries:
            entry_key = (
                entry["group_number"],
                entry["week"],
                entry["day"],
                entry["time"],
                entry["matter"],
                entry["teacher"],
                entry["frame"],
                entry["classroom"],
            )
            if entry_key in seen_entries:
                continue
            seen_entries.add(entry_key)
            unique_entries.append(entry)
        return unique_entries

    async def _collect_literature_bootstrap(self):
        connector = aiohttp.TCPConnector(limit=30, limit_per_host=10)
        timeout = aiohttp.ClientTimeout(total=60, connect=20, sock_read=45)
        collected = []
        seen_ids = set()
        empty_pages = 0
        repeated_pages = 0
        previous_signature = None
        offset = 0

        async with aiohttp.ClientSession(connector=connector, timeout=timeout, headers=DEFAULT_HEADERS) as session:
            while True:
                page_items = await self._fetch_literature_page(session, offset)
                page_signature = tuple(item.get("id") for item in page_items[:10] if item.get("id"))

                if not page_items:
                    empty_pages += 1
                    if empty_pages >= self.LITERATURE_STOP_AFTER_EMPTY_PAGES:
                        return collected
                    offset += LITERATURE_PAGE_LIMIT
                    await asyncio.sleep(0.05)
                    continue

                empty_pages = 0
                if page_signature and page_signature == previous_signature:
                    repeated_pages += 1
                    if repeated_pages >= self.LITERATURE_STOP_AFTER_REPEAT_PAGES:
                        return collected
                else:
                    repeated_pages = 0
                previous_signature = page_signature

                candidates = []
                for item in page_items:
                    item_id = item.get("id")
                    if not item_id or item_id in seen_ids:
                        continue
                    seen_ids.add(item_id)
                    candidates.append(item)

                for item in candidates:
                    payload = self._build_literature_payload(item)
                    if payload:
                        collected.append(payload)

                offset += LITERATURE_PAGE_LIMIT
                await asyncio.sleep(0.05)
        return collected

    async def _sync_literature_bootstrap_async(self, existing_items, sample_per_section=None):
        connector = aiohttp.TCPConnector(limit=10, limit_per_host=5)
        timeout = aiohttp.ClientTimeout(total=120, connect=30, sock_read=90)
        total_created = 0

        async with aiohttp.ClientSession(connector=connector, timeout=timeout, headers=DEFAULT_HEADERS) as session:
            strict_section = not existing_items

            for section_name, section_handle in LITERATURE_TOP_LEVEL_SECTIONS.items():
                community = await self._fetch_literature_handle(session, section_handle, strict=strict_section)
                strict_section = False
                if not community:
                    continue

                collections = await self._collect_literature_section_collections(session, community)
                section_processed = 0
                for collection_id in collections:
                    if sample_per_section and section_processed >= sample_per_section:
                        break
                    empty_pages = 0
                    repeated_pages = 0
                    previous_signature = None
                    offset = 0

                    while True:
                        page_items = await self._fetch_literature_collection_page(session, collection_id, offset)
                        page_signature = tuple(item.get("id") for item in page_items[:10] if item.get("id"))

                        if not page_items:
                            empty_pages += 1
                            if empty_pages >= self.LITERATURE_STOP_AFTER_EMPTY_PAGES:
                                break
                            offset += LITERATURE_PAGE_LIMIT
                            await asyncio.sleep(0.05)
                            continue

                        empty_pages = 0
                        if page_signature and page_signature == previous_signature:
                            repeated_pages += 1
                            if repeated_pages >= self.LITERATURE_STOP_AFTER_REPEAT_PAGES:
                                break
                        else:
                            repeated_pages = 0
                        previous_signature = page_signature

                        page_rows = []
                        page_update_ids = []
                        page_update_payloads = []
                        for item in page_items:
                            source_id = item.get("id")
                            if not source_id:
                                continue

                            current_item = existing_items.get(source_id)
                            expanded_item = await self._fetch_literature_expanded(session, source_id)
                            payload = self._build_literature_payload(expanded_item or item, category=section_name)
                            if payload:
                                document_download_link, document_image_url, document_download_size = await self._fetch_literature_document_assets(
                                    session,
                                    payload["handle"],
                                )
                                if document_download_link:
                                    payload["download_link"] = document_download_link
                                if document_image_url:
                                    payload["image_url"] = document_image_url
                                if document_download_size:
                                    payload["download_size"] = document_download_size
                            if current_item is not None:
                                needs_category_update = current_item.get("category") in {"", "item"}
                                needs_enrichment = any(
                                    not str(current_item.get(field) or "").strip()
                                    for field in ("download_link", "image_url", "authors", "description", "publishing_date")
                                ) or "/bitstream/handle/" not in str(current_item.get("download_link") or "") or (
                                    current_item.get("image_url") and "/bitstream/handle/" not in str(current_item.get("image_url") or "")
                                )

                                if payload and (needs_category_update or needs_enrichment):
                                    page_update_payloads.append((source_id, payload))
                                    existing_items[source_id] = payload
                                elif needs_category_update:
                                    page_update_ids.append(source_id)
                                    current_item["category"] = section_name
                                continue

                            if not payload:
                                continue

                            existing_items[source_id] = payload
                            page_rows.append(self._build_literature_item(payload))

                        if page_rows:
                            await sync_to_async(LiteratureItem.objects.bulk_create)(
                                page_rows,
                                batch_size=50,
                                ignore_conflicts=True,
                            )
                            total_created += len(page_rows)

                        if page_update_ids:
                            await sync_to_async(
                                LiteratureItem.objects.filter(source_id__in=page_update_ids).update
                            )(category=section_name)

                        for source_id, payload in page_update_payloads:
                            await sync_to_async(LiteratureItem.objects.filter(source_id=source_id).update)(
                                handle=payload["handle"],
                                title=payload["title"],
                                faculty=payload["faculty"],
                                category=payload["category"],
                                authors=payload["authors"],
                                publishing_date=payload["publishing_date"],
                                description=payload["description"],
                                image_url=payload["image_url"],
                                download_size=payload["download_size"],
                                download_link=payload["download_link"],
                            )

                        section_processed += len(page_rows) + len(page_update_ids)
                        if sample_per_section and section_processed >= sample_per_section:
                            break

                        offset += LITERATURE_PAGE_LIMIT
                        await asyncio.sleep(0.05)

        return total_created

    async def _collect_literature_incremental(self, existing_source_ids):
        connector = aiohttp.TCPConnector(limit=20, limit_per_host=10)
        timeout = aiohttp.ClientTimeout(total=120, connect=30, sock_read=90)
        collected = []
        empty_pages = 0
        repeated_pages = 0
        previous_signature = None
        offset = 0

        async with aiohttp.ClientSession(connector=connector, timeout=timeout, headers=DEFAULT_HEADERS) as session:
            while True:
                page_items = await self._fetch_literature_page(session, offset)
                page_signature = tuple(item.get("id") for item in page_items[:10] if item.get("id"))

                if not page_items:
                    empty_pages += 1
                    if empty_pages >= self.LITERATURE_STOP_AFTER_EMPTY_PAGES:
                        return collected
                    offset += LITERATURE_PAGE_LIMIT
                    await asyncio.sleep(0.05)
                    continue

                empty_pages = 0
                if page_signature and page_signature == previous_signature:
                    repeated_pages += 1
                    if repeated_pages >= self.LITERATURE_STOP_AFTER_REPEAT_PAGES:
                        return collected
                else:
                    repeated_pages = 0
                previous_signature = page_signature

                for item in page_items:
                    item_id = item.get("id")
                    if not item_id:
                        continue
                    if item_id in existing_source_ids:
                        return collected
                    payload = self._build_literature_payload(item)
                    if not payload:
                        continue
                    collected.append(payload)
                    existing_source_ids.add(item_id)

                offset += LITERATURE_PAGE_LIMIT
                await asyncio.sleep(0.05)
        return collected


    def _get_news_max_page(self):
        response = self._safe_get(f"{NEWS_BASE_URL}/times", verify=False)
        if not response:
            return 1
        soup = bs4.BeautifulSoup(response.content, "html.parser")
        pagination = soup.find("ul", class_="pagination")
        max_page = 1
        if pagination:
            for link in pagination.find_all("a"):
                href = link.get("href", "")
                if "page=" in href:
                    try:
                        max_page = max(max_page, int(href.split("page=")[1]))
                    except ValueError:
                        continue
        return max_page

    async def _fetch_news_page(self, session, page):
        try:
            async with session.get(f"{NEWS_BASE_URL}/times?page={page}") as response:
                if response.status != 200:
                    return []
                page_content = await response.read()
        except aiohttp.ClientError:
            return []
        soup = bs4.BeautifulSoup(page_content, "html.parser", from_encoding="utf-8")
        news_links = soup.find_all("a", href=lambda x: x and "/news/" in x and "/news/tag/" not in x)

        items = []
        seen_links = set()
        for link_element in news_links:
            title = link_element.text.strip()
            link = link_element.get("href", "")
            if not title or not link or title.startswith("#"):
                continue
            full_link = f"{NEWS_BASE_URL}{link}" if link.startswith("/") else link
            if full_link in seen_links:
                continue
            seen_links.add(full_link)
            tags = []
            parent = link_element.parent
            if parent:
                for tag_elem in parent.find_all("a", href=lambda x: x and "/news/tag/" in x):
                    tag_text = tag_elem.text.strip()
                    if tag_text.startswith("#"):
                        tags.append(tag_text)
            items.append({"title": title, "link": full_link, "tags": tags})
        return items

    async def _fetch_news_details(self, session, title, full_link):
        try:
            async with session.get(full_link) as response:
                if response.status != 200:
                    return title, full_link, "", "", "", 1
                raw_content = await response.read()
                detail_soup = bs4.BeautifulSoup(raw_content, "html.parser", from_encoding="utf-8")
                date_element = (
                    detail_soup.find("div", class_="newsDate")
                    or detail_soup.find("time")
                    or detail_soup.find("span", class_="date")
                    or detail_soup.find("div", class_="date")
                )
                date = ""
                if date_element:
                    date = date_element.text.strip()
                    date = re.sub(r"<i[^>]*>.*?</i>", "", date)
                    date = re.sub(r"fas fa-calendar-alt", "", date)
                    date = re.sub(r"\s+", " ", date).strip()

                summary = ""
                content_selectors = [
                    "div.article-content",
                    "div.news-content",
                    "div.content",
                    "div.text",
                    "article p",
                    ".field--name-body p",
                    ".node__content p",
                ]
                for selector in content_selectors:
                    content_element = detail_soup.select_one(selector)
                    if content_element:
                        p_element = content_element.find("p") if content_element.name != "p" else content_element
                        if p_element:
                            summary_text = p_element.text.strip()
                            if len(summary_text) > 20:
                                summary = summary_text[:200] + "..." if len(summary_text) > 200 else summary_text
                                break
                if not summary:
                    for p in detail_soup.find_all("p"):
                        p_text = p.text.strip()
                        if len(p_text) > 30 and "БНТУ – лидер технического образования" not in p_text:
                            summary = p_text[:200] + "..." if len(p_text) > 200 else p_text
                            break

                image_url = self._extract_news_image(detail_soup)
                reading_time = max(1, math.ceil(len(detail_soup.get_text().split()) / 220))
                return title, full_link, date, summary, image_url, reading_time
        except Exception:
            return title, full_link, "", "", "", 1

    def _extract_news_image(self, detail_soup):
        content_selectors = [
            "div.article-content img",
            "div.news-content img",
            "div.content img",
            "article img",
            ".field--name-body img",
            ".node__content img",
        ]
        for selector in content_selectors:
            img_element = detail_soup.select_one(selector)
            if img_element and img_element.get("src"):
                return self._normalize_image_url(img_element["src"])

        image_selectors = [
            "img.news-image",
            "img.article-image",
            "img.main-image",
            "div.news img:first-child",
            "div.article img:first-child",
            ".field--name-field-image img",
            ".news__image img",
        ]
        for selector in image_selectors:
            img_element = detail_soup.select_one(selector)
            if img_element and img_element.get("src"):
                img_src = img_element["src"]
                if not any(skip in img_src.lower() for skip in ["banner", "logo", "icon", "avatar"]):
                    return self._normalize_image_url(img_src)

        for img in detail_soup.find_all("img"):
            img_src = img.get("src")
            if not img_src or any(skip in img_src.lower() for skip in ["banner", "logo", "icon", "avatar", "ad"]):
                continue
            width = img.get("width")
            if width and str(width).isdigit() and int(width) > 200:
                return self._normalize_image_url(img_src)
        return ""

    def _normalize_image_url(self, src):
        return f"{NEWS_BASE_URL}{src}" if src.startswith("/") else src

    def _build_news_payload(self, details, tags):
        title, full_link, date, summary, image_url, reading_time = details
        news_date = self._parse_news_date(date)
        if not news_date or news_date < self.news_threshold:
            return None
        return {
            "title": title or "",
            "link": full_link or "",
            "date": date or "",
            "timestamp": int(news_date.timestamp()),
            "summary": summary or "",
            "tags": ",".join(tags),
            "image_url": image_url or "",
            "reading_time": reading_time or 1,
        }

    def _build_news_item(self, item):
        return NewsItem(
            title=item["title"],
            link=item["link"],
            date=item["date"],
            timestamp=item["timestamp"],
            summary=item["summary"],
            tags=item["tags"],
            image_url=item["image_url"],
            reading_time=item["reading_time"],
        )

    def _parse_news_date(self, date):
        if not date:
            return None
        clean_date = re.sub(r"\s+", " ", date.strip().lower())
        clean_date = clean_date.translate(LATIN_TO_CYRILLIC)
        clean_date = clean_date.replace(",", " ")
        clean_date = re.sub(r"\bг\.\b", " ", clean_date)
        clean_date = re.sub(r"\bгода\b", " ", clean_date)
        clean_date = re.sub(r"\bв\b", " ", clean_date)
        clean_date = re.sub(r"\s+", " ", clean_date).strip()

        patterns = [
            r"(\d{1,2})\s+(\w+)\s+(\d{4})\s+(\d{1,2}):(\d{2})",
            r"(\d{1,2})\s+(\w+)\s+(\d{4})",
            r"(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})",
            r"(\d{1,2})\.(\d{1,2})\.(\d{4})",
            r"(\d{1,2})/(\d{1,2})/(\d{4})\s+(\d{1,2}):(\d{2})",
            r"(\d{1,2})/(\d{1,2})/(\d{4})",
            r"(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})",
            r"(\d{4})-(\d{1,2})-(\d{1,2})",
        ]

        for index, pattern in enumerate(patterns):
            match = re.search(pattern, clean_date)
            if not match:
                continue
            if index in {0, 2, 4, 6}:
                if index == 0:
                    day, month_name, year, hour, minute = match.groups()
                    month = MONTH_MAP.get(month_name.lower())
                elif index == 2:
                    day, month, year, hour, minute = match.groups()
                elif index == 4:
                    day, month, year, hour, minute = match.groups()
                else:
                    year, month, day, hour, minute = match.groups()
                try:
                    return datetime(int(year), int(month), int(day), int(hour), int(minute))
                except (TypeError, ValueError):
                    return None

            if index == 1:
                day, month_name, year = match.groups()
                month = MONTH_MAP.get(month_name.lower())
            elif index == 3:
                day, month, year = match.groups()
            elif index == 5:
                day, month, year = match.groups()
            else:
                year, month, day = match.groups()
            try:
                return datetime(int(year), int(month), int(day))
            except (TypeError, ValueError):
                return None
        return None

    async def _fetch_schedule_groups(self, session, endpoint):
        async with session.get(endpoint, ssl=False) as response:
            if response.status != 200:
                return []
            soup = bs4.BeautifulSoup(await response.text(), "html.parser")
            courses = soup.find_all("input", class_="course-checkbox")
            group_div = soup.find("div", attrs={"id": "group"})
            if not group_div:
                return []
            groups = []
            seen_groups = set()
            for i in range(len(courses)):
                select = group_div.find("select", attrs={"name": f"group{i + 1}"})
                if not select:
                    continue
                for child in select.find_all(recursive=False):
                    value = child.get("value")
                    if value and value != "Номер:" and value not in seen_groups:
                        seen_groups.add(value)
                        groups.append(value)
            return groups

    async def _fetch_schedule_table(self, session, endpoint, group):
        try:
            headers = {"cookie": f"group={group};"}
            async with session.get(endpoint + "/table", headers=headers, ssl=False) as response:
                if response.status == 200:
                    return bs4.BeautifulSoup(await response.text(), "html.parser")
        except Exception:
            return None
        return None

    def _extract_schedule_entries(self, group, soup):
        entries = []
        tables = soup.find_all("table", class_="sheduleTable")
        for week, table in enumerate(tables):
            rows = table.find("tbody").find_all("tr") if table.find("tbody") else table.find_all("tr")
            current_day = None
            for row in rows:
                day_element = row.find("td", class_="newDay")
                if day_element:
                    current_day = day_element.text.replace("\n", "").replace(" ", "")
                time_element = row.find("td", class_="time")
                if not time_element:
                    continue
                lesson_time = time_element.text.strip()
                if not lesson_time or not current_day:
                    continue
                matter_element = time_element.next_sibling.next_sibling
                matter = matter_element.text.strip() if matter_element else ""
                matter = SCHEDULE_PATTERN.sub(
                    lambda match: f"({SCHEDULE_REPLACEMENTS[match.group(1).capitalize()]})",
                    matter,
                )
                if not matter:
                    continue
                teacher_element = matter_element.next_sibling.next_sibling if matter_element else None
                teacher = re.sub(r"\s+", " ", teacher_element.text).strip() if teacher_element else ""
                frame_element = teacher_element.next_sibling.next_sibling if teacher_element else None
                frame = frame_element.text if frame_element else ""
                classroom_element = frame_element.next_sibling.next_sibling if frame_element else None
                classroom = classroom_element.text if classroom_element else ""
                entries.append(
                    {
                        "group_number": group,
                        "week": week,
                        "day": current_day,
                        "time": lesson_time,
                        "matter": matter,
                        "teacher": teacher,
                        "frame": frame,
                        "classroom": classroom,
                    }
                )
        return entries

    async def _fetch_literature_page(self, session, offset, strict=False):
        return await self._fetch_literature_json(
            session,
            f"{LITERATURE_REST_BASE_URL}/items?limit={LITERATURE_PAGE_LIMIT}&offset={offset}",
            default=[],
            strict=strict,
        )

    async def _fetch_literature_collection_page(self, session, collection_id, offset):
        return await self._fetch_literature_json(
            session,
            f"{LITERATURE_REST_BASE_URL}/collections/{collection_id}/items?limit={LITERATURE_PAGE_LIMIT}&offset={offset}",
            default=[],
        )

    async def _fetch_literature_handle(self, session, handle, strict=False):
        return await self._fetch_literature_json(
            session,
            f"{LITERATURE_REST_BASE_URL}/handle/{handle}",
            default={},
            strict=strict,
        )

    async def _fetch_literature_community_children(self, session, community_id):
        return await self._fetch_literature_json(
            session,
            f"{LITERATURE_REST_BASE_URL}/communities/{community_id}/communities",
            default=[],
        )

    async def _fetch_literature_community_collections(self, session, community_id):
        return await self._fetch_literature_json(
            session,
            f"{LITERATURE_REST_BASE_URL}/communities/{community_id}/collections",
            default=[],
        )

    async def _collect_literature_section_collections(self, session, community):
        root_id = community.get("id")
        if not root_id:
            return []

        collections = []
        queue = [root_id]
        seen_communities = set()

        while queue:
            community_id = queue.pop(0)
            if community_id in seen_communities:
                continue
            seen_communities.add(community_id)

            collections.extend(
                collection.get("id")
                for collection in await self._fetch_literature_community_collections(session, community_id)
                if collection.get("id")
            )
            queue.extend(
                child.get("id")
                for child in await self._fetch_literature_community_children(session, community_id)
                if child.get("id") and child.get("id") not in seen_communities
            )

        return collections

    async def _fetch_literature_metadata(self, session, item_id):
        return await self._fetch_literature_json(
            session,
            f"{LITERATURE_REST_BASE_URL}/items/{item_id}/metadata",
            default=[],
        )

    async def _fetch_literature_expanded(self, session, item_id):
        return await self._fetch_literature_json(
            session,
            f"{LITERATURE_REST_BASE_URL}/items/{item_id}?expand=all",
            default={},
        )

    async def _fetch_literature_json(self, session, url, default, strict=False):
        for attempt in range(self.LITERATURE_REQUEST_RETRIES):
            try:
                async with session.get(url, ssl=False) as response:
                    if response.status != 200:
                        if strict:
                            raise RuntimeError(f"Literature request returned HTTP {response.status} for {url}")
                        return default
                    return await response.json(content_type=None)
            except (aiohttp.ClientError, asyncio.TimeoutError, ValueError, RuntimeError) as exc:
                if attempt == self.LITERATURE_REQUEST_RETRIES - 1:
                    logger.warning("Literature request failed for %s: %s", url, exc)
                    if strict:
                        raise RuntimeError(f"Literature request failed for {url}") from exc
                    return default
                await asyncio.sleep(self.LITERATURE_RETRY_DELAY_SECONDS * (attempt + 1))
        return default

    async def _fetch_literature_payload(self, _session, item):
        return self._build_literature_payload(item)

    def _metadata_to_dict(self, meta_list):
        result = {}
        for row in meta_list or []:
            key = row.get("key")
            value = row.get("value")
            if not key or value in {None, ""}:
                continue
            if key in result:
                if isinstance(result[key], list):
                    result[key].append(value)
                else:
                    result[key] = [result[key], value]
            else:
                result[key] = value
        return result

    def _ensure_list(self, value):
        if value is None:
            return []
        if isinstance(value, list):
            return value
        return [value]

    def _normalize_rest_link(self, value):
        if not value:
            return ""
        if value.startswith("http://") or value.startswith("https://"):
            return value
        if value.startswith("/bitstreams/"):
            return f"https://rep.bntu.by/rest{value}"
        if value.startswith("/rest/"):
            return f"https://rep.bntu.by{value}"
        if value.startswith("/"):
            return f"https://rep.bntu.by{value}"
        return f"https://rep.bntu.by/{value.lstrip('/')}"

    def _pick_literature_download_bitstream(self, bitstreams):
        originals = [bitstream for bitstream in bitstreams if (bitstream.get("bundleName") or "").upper() == "ORIGINAL"]
        candidates = originals or bitstreams
        for bitstream in candidates:
            retrieve_link = self._normalize_rest_link(bitstream.get("retrieveLink") or bitstream.get("link"))
            if retrieve_link:
                return retrieve_link, str(bitstream.get("sizeBytes") or "")
        return "", ""

    def _pick_literature_thumbnail(self, bitstreams):
        thumbnails = [bitstream for bitstream in bitstreams if (bitstream.get("bundleName") or "").upper() == "THUMBNAIL"]
        candidates = thumbnails or [bitstream for bitstream in bitstreams if str(bitstream.get("mimeType") or "").startswith("image/")]
        for bitstream in candidates:
            retrieve_link = self._normalize_rest_link(bitstream.get("retrieveLink") or bitstream.get("link"))
            if retrieve_link:
                return retrieve_link
        return ""

    async def _fetch_literature_document_assets(self, session, handle):
        if not handle:
            return "", "", ""

        document_url = f"https://rep.bntu.by/handle/{quote(handle)}"
        try:
            async with session.get(document_url, ssl=False) as response:
                if response.status != 200:
                    return "", "", ""
                soup = bs4.BeautifulSoup(await response.text(), "html.parser")
        except (aiohttp.ClientError, asyncio.TimeoutError, ValueError):
            return "", "", ""

        download_link = ""
        download_size = ""
        image_url = ""

        for anchor in soup.find_all("a", href=True):
            href = anchor.get("href", "")
            if "/bitstream/handle/" not in href:
                continue

            normalized_href = self._normalize_rest_link(href).replace("/rest/bitstream/handle/", "/bitstream/handle/")
            link_text = " ".join(anchor.stripped_strings)

            if href.lower().endswith((".jpg", ".jpeg", ".png", ".webp")) or normalized_href.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                if not image_url:
                    image_url = normalized_href
                continue

            if not download_link:
                download_link = normalized_href
                size_match = re.search(r"\(([^)]+)\)", link_text)
                if size_match:
                    download_size = size_match.group(1).strip()

        if not image_url:
            thumbnail = soup.find("img", src=True, alt=lambda value: value and "thumbnail" in value.lower())
            if thumbnail:
                image_url = self._normalize_rest_link(thumbnail.get("src", "")).replace(
                    "/rest/bitstream/handle/",
                    "/bitstream/handle/",
                )

        return download_link, image_url, download_size

    def _build_literature_payload(self, item, category=""):
        title = str(item.get("name") or "")
        handle = str(item.get("handle") or "")
        literature_link = f"https://rep.bntu.by/handle/{quote(handle)}" if handle else ""
        publishing_date = str(item.get("lastModified") or "")[:10]
        metadata = self._metadata_to_dict(item.get("metadata"))
        bitstreams = item.get("bitstreams") or []
        authors = self._ensure_list(metadata.get("dc.contributor.author"))
        description = (
            metadata.get("dc.description.abstract")
            or metadata.get("dc.description")
            or metadata.get("dc.identifier.citation")
            or ""
        )
        issued = metadata.get("dc.date.issued")
        if issued:
            publishing_date = str(issued)

        download_link, download_size = self._pick_literature_download_bitstream(bitstreams)
        image_url = self._pick_literature_thumbnail(bitstreams)
        if not download_link:
            download_link = literature_link

        return {
            "source_id": item.get("id"),
            "handle": handle,
            "title": str(metadata.get("dc.title") or title)[:255],
            "faculty": "",
            "category": category,
            "authors": ", ".join(str(author) for author in authors if author),
            "publishing_date": publishing_date,
            "description": str(description),
            "image_url": image_url,
            "download_size": download_size,
            "download_link": download_link,
        }

    def _build_literature_item(self, item):
        return LiteratureItem(
            source_id=item["source_id"],
            handle=item["handle"],
            title=item["title"],
            faculty=item["faculty"],
            category=item["category"],
            authors=item["authors"],
            publishing_date=item["publishing_date"],
            description=item["description"],
            image_url=item["image_url"],
            download_size=item["download_size"],
            download_link=item["download_link"],
        )

    def _safe_get(self, url, **kwargs):
        try:
            headers = kwargs.pop("headers", DEFAULT_HEADERS)
            return requests.get(url, timeout=10, headers=headers, **kwargs)
        except requests.RequestException:
            return None
