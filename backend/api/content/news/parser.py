import asyncio
import math
import re
from datetime import datetime

import aiohttp
import bs4

from ...models import NewsItem


NEWS_BASE_URL = "https://times.bntu.by"

MONTH_ALIASES = {
    1: ("января", "январь", "янв"),
    2: ("февраля", "февраль", "фев"),
    3: ("марта", "март", "мар"),
    4: ("апреля", "апрель", "апр"),
    5: ("мая", "май"),
    6: ("июня", "июнь", "июн"),
    7: ("июля", "июль", "июл"),
    8: ("августа", "август", "авг"),
    9: ("сентября", "сентябрь", "сен"),
    10: ("октября", "октябрь", "окт"),
    11: ("ноября", "ноябрь", "ноя"),
    12: ("декабря", "декабрь", "дек"),
}

LOOKALIKE_LATIN_TO_CYRILLIC = str.maketrans(
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


def _mojibake_variant(text):
    return text.encode("utf-8").decode("latin1")


def _normalize_month_alias(text):
    normalized = str(text or "").strip().lower()
    normalized = normalized.translate(LOOKALIKE_LATIN_TO_CYRILLIC)
    return re.sub(r"[^a-zа-яё]", "", normalized)


def _build_month_lookup():
    lookup = {}
    for month, aliases in MONTH_ALIASES.items():
        for alias in aliases:
            for variant in {alias, _mojibake_variant(alias)}:
                lookup[_normalize_month_alias(variant)] = month
    return lookup


MONTH_LOOKUP = _build_month_lookup()


def _demojibake(text):
    try:
        fixed = text.encode("latin1").decode("utf-8")
        return fixed or text
    except (UnicodeEncodeError, UnicodeDecodeError):
        return text


async def collect_news_bootstrap(service):
    connector = aiohttp.TCPConnector(limit=10)
    timeout = aiohttp.ClientTimeout(total=120)
    collected = []
    seen_links = set()
    stale_pages = 0
    empty_pages = 0
    repeated_pages = 0
    previous_signature = None
    max_page = max(1, get_news_max_page(service))
    page = 1

    async with aiohttp.ClientSession(connector=connector, timeout=timeout, headers=service.default_headers) as session:
        while True:
            page_items = await service._fetch_news_page(session, page)
            page_signature = tuple(item.get("link") for item in page_items[:10] if item.get("link"))

            if not page_items:
                empty_pages += 1
                if page > max_page and empty_pages >= service.NEWS_STOP_AFTER_EMPTY_PAGES:
                    break
                page += 1
                await asyncio.sleep(0.05)
                continue

            empty_pages = 0
            if page_signature and page_signature == previous_signature:
                repeated_pages += 1
                if repeated_pages >= service.NEWS_STOP_AFTER_REPEAT_PAGES:
                    break
            else:
                repeated_pages = 0
            previous_signature = page_signature

            page_has_recent = False
            for item in page_items:
                link = item.get("link")
                if not link or link in seen_links:
                    continue
                seen_links.add(link)

                news = service._build_news_listing_payload(item)
                if not news:
                    details = await service._fetch_news_details(session, item["title"], link)
                    news = service._build_news_payload(details, item["tags"])
                if not news:
                    continue

                page_has_recent = True
                collected.append(news)

            if page_has_recent:
                stale_pages = 0
            else:
                stale_pages += 1
                if stale_pages >= service.NEWS_STOP_AFTER_STALE_PAGES:
                    break

            page += 1
            await asyncio.sleep(0.05)

    return collected


async def collect_news_incremental(service, existing_links):
    connector = aiohttp.TCPConnector(limit=10)
    timeout = aiohttp.ClientTimeout(total=120)
    collected = []
    seen_links = set()
    page = 1

    async with aiohttp.ClientSession(connector=connector, timeout=timeout, headers=service.default_headers) as session:
        while True:
            page_items = await service._fetch_news_page(session, page)
            if not page_items:
                break

            should_stop = False
            for item in page_items:
                link = item.get("link")
                if not link or link in seen_links:
                    continue
                seen_links.add(link)

                if link in existing_links:
                    should_stop = True
                    break

                news = service._build_news_listing_payload(item)
                if not news:
                    details = await service._fetch_news_details(session, item["title"], link)
                    news = service._build_news_payload(details, item["tags"])
                if news:
                    collected.append(news)

            if should_stop:
                break

            page += 1
            await asyncio.sleep(0.05)

    return collected


def get_news_max_page(service):
    response = service._safe_get(f"{NEWS_BASE_URL}/times", verify=False)
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


async def fetch_news_page(service, session, page):
    async def fetch_page_content():
        async with session.get(
            f"{NEWS_BASE_URL}/times?page={page}",
            ssl=False if service.allow_insecure_ssl else None,
        ) as response:
            if response.status != 200:
                raise RuntimeError(f"News page request returned HTTP {response.status} for page {page}")
            return await response.read()

    try:
        async for attempt in service._async_retry_policy(3, 0.35, (aiohttp.ClientError, asyncio.TimeoutError, RuntimeError)):
            with attempt:
                page_content = await fetch_page_content()
                break
    except (aiohttp.ClientError, asyncio.TimeoutError, RuntimeError) as exc:
        service.logger.warning("News page request failed for page %s: %s", page, exc)
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

        card = link_element.find_parent("div", class_="newsOne")
        tags = []
        date_text = ""
        summary = ""
        image_url = ""
        if card:
            for tag_elem in card.find_all("a", href=lambda x: x and "/news/tag/" in x):
                tag_text = tag_elem.text.strip()
                if tag_text.startswith("#"):
                    tags.append(tag_text)
            date_element = card.find("div", class_="newsDate")
            if date_element:
                date_text = date_element.get_text(" ", strip=True)
            summary_element = card.find("div", class_="newsText")
            if summary_element:
                summary = summary_element.get_text(" ", strip=True)
            image_link = card.find("a", class_="newsImage")
            if image_link:
                image_url = extract_news_card_image(image_link.get("style", ""))

        items.append(
            {
                "title": title,
                "link": full_link,
                "tags": tags,
                "date": date_text,
                "summary": summary,
                "image_url": image_url,
                "reading_time": max(1, math.ceil(len(summary.split()) / 220)) if summary else 1,
            }
        )
    return items


async def fetch_news_details(service, session, title, full_link):
    async def fetch_detail_content():
        async with session.get(
            full_link,
            ssl=False if service.allow_insecure_ssl else None,
        ) as response:
            if response.status != 200:
                raise RuntimeError(f"News detail request returned HTTP {response.status} for {full_link}")
            return await response.read()

    try:
        async for attempt in service._async_retry_policy(3, 0.35, (aiohttp.ClientError, asyncio.TimeoutError, RuntimeError)):
            with attempt:
                raw_content = await fetch_detail_content()
                detail_soup = bs4.BeautifulSoup(raw_content, "html.parser", from_encoding="utf-8")
                date_element = (
                    detail_soup.find("div", class_="newsDate")
                    or detail_soup.find("time")
                    or detail_soup.find("span", class_="date")
                    or detail_soup.find("div", class_="date")
                )
                date = ""
                if date_element:
                    date = re.sub(r"\s+", " ", date_element.get_text(" ", strip=True)).strip()

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
                            summary_text = p_element.get_text(" ", strip=True)
                            if len(summary_text) > 20:
                                summary = summary_text[:200] + "..." if len(summary_text) > 200 else summary_text
                                break
                if not summary:
                    for p in detail_soup.find_all("p"):
                        p_text = p.get_text(" ", strip=True)
                        if len(p_text) > 30:
                            summary = p_text[:200] + "..." if len(p_text) > 200 else p_text
                            break

                image_url = extract_news_image(detail_soup)
                reading_time = max(1, math.ceil(len(detail_soup.get_text().split()) / 220))
                return title, full_link, date, summary, image_url, reading_time
    except (aiohttp.ClientError, asyncio.TimeoutError, RuntimeError, ValueError):
        return title, full_link, "", "", "", 1


def extract_news_image(detail_soup):
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
            return normalize_image_url(img_element["src"])

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
                return normalize_image_url(img_src)

    for img in detail_soup.find_all("img"):
        img_src = img.get("src")
        if not img_src or any(skip in img_src.lower() for skip in ["banner", "logo", "icon", "avatar", "ad"]):
            continue
        width = img.get("width")
        if width and str(width).isdigit() and int(width) > 200:
            return normalize_image_url(img_src)
    return ""


def normalize_image_url(src):
    return f"{NEWS_BASE_URL}{src}" if src.startswith("/") else src


def extract_news_card_image(style_value):
    if not style_value:
        return ""
    match = re.search(r"url\(['\"]?(.*?)['\"]?\)", style_value)
    if not match:
        return ""
    src = match.group(1).strip()
    if not src or "no.png" in src:
        return ""
    return normalize_image_url(src)


def build_news_payload(service, details, tags):
    title, full_link, date, summary, image_url, reading_time = details
    news_date = parse_news_date(date)
    if not news_date or news_date < service.news_threshold:
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


def build_news_listing_payload(service, item):
    news_date = parse_news_date(item.get("date", ""))
    if not news_date or news_date < service.news_threshold:
        return None
    return {
        "title": item.get("title", ""),
        "link": item.get("link", ""),
        "date": item.get("date", ""),
        "timestamp": int(news_date.timestamp()),
        "summary": item.get("summary", ""),
        "tags": ",".join(item.get("tags", [])),
        "image_url": item.get("image_url", ""),
        "reading_time": item.get("reading_time", 1) or 1,
    }


def build_news_item(item):
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


def resolve_news_month(month_name):
    normalized = _normalize_month_alias(_demojibake(month_name))
    month = MONTH_LOOKUP.get(normalized)
    if month:
        return month
    if len(normalized) >= 3:
        prefix = normalized[:3]
        for alias, alias_month in MONTH_LOOKUP.items():
            if alias.startswith(prefix):
                return alias_month
    return None


def parse_news_date(date):
    if not date:
        return None

    clean_date = str(date).strip().lower()
    clean_date = _demojibake(clean_date)
    clean_date = clean_date.translate(LOOKALIKE_LATIN_TO_CYRILLIC)
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
                month = resolve_news_month(month_name)
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
            month = resolve_news_month(month_name)
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
