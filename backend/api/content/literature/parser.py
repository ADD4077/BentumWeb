import asyncio
import re
from urllib.parse import quote

import aiohttp
import bs4
from asgiref.sync import sync_to_async

from ...models import LiteratureItem


async def collect_literature_bootstrap(service):
    connector = aiohttp.TCPConnector(limit=30, limit_per_host=10)
    timeout = aiohttp.ClientTimeout(total=60, connect=20, sock_read=45)
    collected = []
    seen_ids = set()
    empty_pages = 0
    repeated_pages = 0
    previous_signature = None
    offset = 0

    async with aiohttp.ClientSession(connector=connector, timeout=timeout, headers=service.default_headers) as session:
        while True:
            page_items = await service._fetch_literature_page(session, offset)
            page_signature = tuple(item.get("id") for item in page_items[:10] if item.get("id"))

            if not page_items:
                empty_pages += 1
                if empty_pages >= service.LITERATURE_STOP_AFTER_EMPTY_PAGES:
                    return collected
                offset += service.literature_page_limit
                await asyncio.sleep(0.05)
                continue

            empty_pages = 0
            if page_signature and page_signature == previous_signature:
                repeated_pages += 1
                if repeated_pages >= service.LITERATURE_STOP_AFTER_REPEAT_PAGES:
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
                payload = service._build_literature_payload(item)
                if payload:
                    collected.append(payload)

            offset += service.literature_page_limit
            await asyncio.sleep(0.05)
    return collected


async def sync_literature_bootstrap_async(service, existing_items, sample_per_section=None):
    connector = aiohttp.TCPConnector(limit=10, limit_per_host=5)
    timeout = aiohttp.ClientTimeout(total=120, connect=30, sock_read=90)
    total_created = 0
    semaphore = asyncio.Semaphore(service.LITERATURE_ITEM_CONCURRENCY)

    async with aiohttp.ClientSession(connector=connector, timeout=timeout, headers=service.default_headers) as session:
        strict_section = not existing_items

        for section_name, section_handle in service.literature_top_level_sections.items():
            community = await service._fetch_literature_handle(session, section_handle, strict=strict_section)
            strict_section = False
            if not community:
                continue

            collections = await service._collect_literature_section_collections(session, community)
            section_processed = 0
            for collection_id in collections:
                if sample_per_section and section_processed >= sample_per_section:
                    break
                empty_pages = 0
                repeated_pages = 0
                previous_signature = None
                offset = 0

                while True:
                    page_items = await service._fetch_literature_collection_page(session, collection_id, offset)
                    page_signature = tuple(item.get("id") for item in page_items[:10] if item.get("id"))

                    if not page_items:
                        empty_pages += 1
                        if empty_pages >= service.LITERATURE_STOP_AFTER_EMPTY_PAGES:
                            break
                        offset += service.literature_page_limit
                        await asyncio.sleep(0.05)
                        continue

                    empty_pages = 0
                    if page_signature and page_signature == previous_signature:
                        repeated_pages += 1
                        if repeated_pages >= service.LITERATURE_STOP_AFTER_REPEAT_PAGES:
                            break
                    else:
                        repeated_pages = 0
                    previous_signature = page_signature

                    page_rows = []
                    page_category_updates = []
                    page_update_models = []
                    process_tasks = [
                        service._process_literature_page_item(
                            session,
                            semaphore,
                            item,
                            section_name,
                            existing_items.get(item.get("id")),
                        )
                        for item in page_items
                        if item.get("id")
                    ]
                    results = await asyncio.gather(*process_tasks, return_exceptions=True)

                    for result in results:
                        if isinstance(result, Exception) or not result:
                            continue

                        source_id = result["source_id"]
                        current_item = result["current_item"]
                        payload = result.get("payload")
                        action = result["action"]

                        if action == "category":
                            if current_item and current_item.get("id"):
                                current_item["category"] = section_name
                                page_category_updates.append(
                                    LiteratureItem(id=current_item["id"], category=section_name)
                                )
                            continue

                        if action == "update":
                            if not payload or not current_item or not current_item.get("id"):
                                continue
                            payload["id"] = current_item["id"]
                            existing_items[source_id] = payload
                            page_update_models.append(service._build_literature_update_model(payload))
                            continue

                        if action == "create":
                            if not payload:
                                continue
                            existing_items[source_id] = payload
                            page_rows.append(service._build_literature_item(payload))

                    if page_rows:
                        await sync_to_async(LiteratureItem.objects.bulk_create)(
                            page_rows,
                            batch_size=50,
                            ignore_conflicts=True,
                        )
                        total_created += len(page_rows)

                    if page_category_updates:
                        await sync_to_async(LiteratureItem.objects.bulk_update)(
                            page_category_updates,
                            ["category"],
                            batch_size=100,
                        )

                    if page_update_models:
                        await sync_to_async(LiteratureItem.objects.bulk_update)(
                            page_update_models,
                            [
                                "handle",
                                "title",
                                "faculty",
                                "category",
                                "authors",
                                "publishing_date",
                                "description",
                                "image_url",
                                "download_size",
                                "download_link",
                            ],
                            batch_size=100,
                        )

                    section_processed += len(page_rows) + len(page_category_updates) + len(page_update_models)
                    if sample_per_section and section_processed >= sample_per_section:
                        break

                    offset += service.literature_page_limit
                    await asyncio.sleep(0.05)

    return total_created


async def sync_literature_incremental_async(service, existing_source_ids):
    connector = aiohttp.TCPConnector(limit=10, limit_per_host=5)
    timeout = aiohttp.ClientTimeout(total=120, connect=30, sock_read=90)
    total_created = 0
    semaphore = asyncio.Semaphore(service.LITERATURE_ITEM_CONCURRENCY)

    async with aiohttp.ClientSession(connector=connector, timeout=timeout, headers=service.default_headers) as session:
        for section_name, section_handle in service.literature_top_level_sections.items():
            community = await service._fetch_literature_handle(session, section_handle)
            if not community:
                continue

            collections = await service._collect_literature_section_collections(session, community)
            for collection_id in collections:
                empty_pages = 0
                repeated_pages = 0
                known_pages = 0
                previous_signature = None
                offset = 0

                while True:
                    page_items = await service._fetch_literature_collection_page(session, collection_id, offset)
                    page_signature = tuple(item.get("id") for item in page_items[:10] if item.get("id"))

                    if not page_items:
                        empty_pages += 1
                        if empty_pages >= service.LITERATURE_STOP_AFTER_EMPTY_PAGES:
                            break
                        offset += service.literature_page_limit
                        await asyncio.sleep(0.05)
                        continue

                    empty_pages = 0
                    if page_signature and page_signature == previous_signature:
                        repeated_pages += 1
                        if repeated_pages >= service.LITERATURE_STOP_AFTER_REPEAT_PAGES:
                            break
                    else:
                        repeated_pages = 0
                    previous_signature = page_signature

                    new_items = [
                        item for item in page_items
                        if item.get("id") and item.get("id") not in existing_source_ids
                    ]
                    if not new_items:
                        known_pages += 1
                        if known_pages >= service.LITERATURE_INCREMENTAL_STOP_AFTER_KNOWN_PAGES:
                            break
                        offset += service.literature_page_limit
                        await asyncio.sleep(0.05)
                        continue

                    known_pages = 0
                    process_tasks = [
                        service._process_literature_page_item(
                            session,
                            semaphore,
                            item,
                            section_name,
                            None,
                        )
                        for item in new_items
                    ]
                    results = await asyncio.gather(*process_tasks, return_exceptions=True)
                    page_rows = []

                    for result in results:
                        if isinstance(result, Exception) or not result:
                            continue
                        if result["action"] != "create" or not result.get("payload"):
                            continue
                        payload = result["payload"]
                        existing_source_ids.add(result["source_id"])
                        page_rows.append(service._build_literature_item(payload))

                    if page_rows:
                        await sync_to_async(LiteratureItem.objects.bulk_create)(
                            page_rows,
                            batch_size=50,
                            ignore_conflicts=True,
                        )
                        total_created += len(page_rows)

                    offset += service.literature_page_limit
                    await asyncio.sleep(0.05)

    return total_created


def literature_item_needs_enrichment(current_item):
    if not current_item:
        return True

    if any(
        not str(current_item.get(field) or "").strip()
        for field in ("download_link", "image_url", "authors", "description", "publishing_date")
    ):
        return True

    download_link = str(current_item.get("download_link") or "")
    image_url = str(current_item.get("image_url") or "")
    if download_link and "/bitstream/handle/" not in download_link:
        return True
    if image_url and "/bitstream/handle/" not in image_url:
        return True
    return False


def literature_payload_needs_document_assets(payload):
    if not payload:
        return False

    download_link = str(payload.get("download_link") or "")
    image_url = str(payload.get("image_url") or "")
    download_size = str(payload.get("download_size") or "")
    return (
        not download_link
        or "/bitstream/handle/" not in download_link
        or not image_url
        or "/bitstream/handle/" not in image_url
        or not download_size
    )


async def process_literature_page_item(service, session, semaphore, item, section_name, current_item):
    source_id = item.get("id")
    if not source_id:
        return None

    needs_category_update = bool(current_item) and current_item.get("category") in {"", "item"}
    needs_enrichment = service._literature_item_needs_enrichment(current_item)

    if current_item and not needs_category_update and not needs_enrichment:
        return {
            "action": "skip",
            "source_id": source_id,
            "current_item": current_item,
        }

    if current_item and needs_category_update and not needs_enrichment:
        return {
            "action": "category",
            "source_id": source_id,
            "current_item": current_item,
        }

    async with semaphore:
        expanded_item = await service._fetch_literature_expanded(session, source_id)
        payload = service._build_literature_payload(expanded_item or item, category=section_name)
        if payload and service._literature_payload_needs_document_assets(payload):
            document_download_link, document_image_url, document_download_size = await service._fetch_literature_document_assets(
                session,
                payload["handle"],
            )
            if document_download_link:
                payload["download_link"] = document_download_link
            if document_image_url:
                payload["image_url"] = document_image_url
            if document_download_size:
                payload["download_size"] = document_download_size

    return {
        "action": "update" if current_item else "create",
        "source_id": source_id,
        "current_item": current_item,
        "payload": payload,
    }


async def collect_literature_incremental(service, existing_source_ids):
    connector = aiohttp.TCPConnector(limit=20, limit_per_host=10)
    timeout = aiohttp.ClientTimeout(total=120, connect=30, sock_read=90)
    collected = []
    empty_pages = 0
    repeated_pages = 0
    previous_signature = None
    offset = 0

    async with aiohttp.ClientSession(connector=connector, timeout=timeout, headers=service.default_headers) as session:
        while True:
            page_items = await service._fetch_literature_page(session, offset)
            page_signature = tuple(item.get("id") for item in page_items[:10] if item.get("id"))

            if not page_items:
                empty_pages += 1
                if empty_pages >= service.LITERATURE_STOP_AFTER_EMPTY_PAGES:
                    return collected
                offset += service.literature_page_limit
                await asyncio.sleep(0.05)
                continue

            empty_pages = 0
            if page_signature and page_signature == previous_signature:
                repeated_pages += 1
                if repeated_pages >= service.LITERATURE_STOP_AFTER_REPEAT_PAGES:
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
                payload = service._build_literature_payload(item)
                if not payload:
                    continue
                collected.append(payload)
                existing_source_ids.add(item_id)

            offset += service.literature_page_limit
            await asyncio.sleep(0.05)
    return collected


async def fetch_literature_page(service, session, offset, strict=False):
    return await service._fetch_literature_json(
        session,
        f"{service.literature_rest_base_url}/items?limit={service.literature_page_limit}&offset={offset}",
        default=[],
        strict=strict,
    )


async def fetch_literature_collection_page(service, session, collection_id, offset):
    return await service._fetch_literature_json(
        session,
        f"{service.literature_rest_base_url}/collections/{collection_id}/items?limit={service.literature_page_limit}&offset={offset}",
        default=[],
    )


async def fetch_literature_handle(service, session, handle, strict=False):
    return await service._fetch_literature_json(
        session,
        f"{service.literature_rest_base_url}/handle/{handle}",
        default={},
        strict=strict,
    )


async def fetch_literature_community_children(service, session, community_id):
    return await service._fetch_literature_json(
        session,
        f"{service.literature_rest_base_url}/communities/{community_id}/communities",
        default=[],
    )


async def fetch_literature_community_collections(service, session, community_id):
    return await service._fetch_literature_json(
        session,
        f"{service.literature_rest_base_url}/communities/{community_id}/collections",
        default=[],
    )


async def collect_literature_section_collections(service, session, community):
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
            for collection in await service._fetch_literature_community_collections(session, community_id)
            if collection.get("id")
        )
        queue.extend(
            child.get("id")
            for child in await service._fetch_literature_community_children(session, community_id)
            if child.get("id") and child.get("id") not in seen_communities
        )

    return collections


async def fetch_literature_metadata(service, session, item_id):
    return await service._fetch_literature_json(
        session,
        f"{service.literature_rest_base_url}/items/{item_id}/metadata",
        default=[],
    )


async def fetch_literature_expanded(service, session, item_id):
    return await service._fetch_literature_json(
        session,
        f"{service.literature_rest_base_url}/items/{item_id}?expand=all",
        default={},
    )


async def fetch_literature_json(service, session, url, default, strict=False):
    async def fetch():
        async with session.get(url, ssl=False) as response:
            if response.status != 200:
                if strict:
                    raise RuntimeError(f"Literature request returned HTTP {response.status} for {url}")
                return default
            return await response.json(content_type=None)

    try:
        async for attempt in service._async_retry_policy(
            service.LITERATURE_REQUEST_RETRIES,
            service.LITERATURE_RETRY_DELAY_SECONDS,
            (aiohttp.ClientError, asyncio.TimeoutError, ValueError, RuntimeError),
        ):
            with attempt:
                return await fetch()
    except (aiohttp.ClientError, asyncio.TimeoutError, ValueError, RuntimeError) as exc:
        service.logger.warning("Literature request failed for %s: %s", url, exc)
        if strict:
            raise RuntimeError(f"Literature request failed for {url}") from exc
        return default
    return default


async def fetch_literature_payload(service, _session, item):
    return service._build_literature_payload(item)


def metadata_to_dict(meta_list):
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


def ensure_list(value):
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def normalize_rest_link(service, value):
    if not value:
        return ""
    if value.startswith("http://") or value.startswith("https://"):
        return value
    if value.startswith("/bitstreams/"):
        return f"{service.literature_origin}/rest{value}"
    if value.startswith("/rest/"):
        return f"{service.literature_origin}{value}"
    if value.startswith("/"):
        return f"{service.literature_origin}{value}"
    return f"{service.literature_origin}/{value.lstrip('/')}"


def pick_literature_download_bitstream(service, bitstreams):
    originals = [bitstream for bitstream in bitstreams if (bitstream.get("bundleName") or "").upper() == "ORIGINAL"]
    candidates = originals or bitstreams
    for bitstream in candidates:
        retrieve_link = normalize_rest_link(service, bitstream.get("retrieveLink") or bitstream.get("link"))
        if retrieve_link:
            return retrieve_link, str(bitstream.get("sizeBytes") or "")
    return "", ""


def pick_literature_thumbnail(service, bitstreams):
    thumbnails = [bitstream for bitstream in bitstreams if (bitstream.get("bundleName") or "").upper() == "THUMBNAIL"]
    candidates = thumbnails or [bitstream for bitstream in bitstreams if str(bitstream.get("mimeType") or "").startswith("image/")]
    for bitstream in candidates:
        retrieve_link = normalize_rest_link(service, bitstream.get("retrieveLink") or bitstream.get("link"))
        if retrieve_link:
            return retrieve_link
    return ""


async def fetch_literature_document_assets(service, session, handle):
    if not handle:
        return "", "", ""

    document_url = f"{service.literature_origin}/handle/{quote(handle)}"

    async def fetch_document_markup():
        async with session.get(document_url, ssl=False) as response:
            if response.status != 200:
                raise RuntimeError(f"Literature handle request returned HTTP {response.status} for {handle}")
            return await response.text()

    try:
        async for attempt in service._async_retry_policy(
            service.LITERATURE_REQUEST_RETRIES,
            service.LITERATURE_RETRY_DELAY_SECONDS,
            (aiohttp.ClientError, asyncio.TimeoutError, ValueError, RuntimeError),
        ):
            with attempt:
                markup = await fetch_document_markup()
                soup = bs4.BeautifulSoup(markup, "html.parser")
                break
    except (aiohttp.ClientError, asyncio.TimeoutError, ValueError, RuntimeError):
        return "", "", ""

    download_link = ""
    download_size = ""
    image_url = ""

    for anchor in soup.find_all("a", href=True):
        href = anchor.get("href", "")
        if "/bitstream/handle/" not in href:
            continue

        normalized_href = normalize_rest_link(service, href).replace("/rest/bitstream/handle/", "/bitstream/handle/")
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
            image_url = normalize_rest_link(service, thumbnail.get("src", "")).replace(
                "/rest/bitstream/handle/",
                "/bitstream/handle/",
            )

    return download_link, image_url, download_size


def build_literature_payload(service, item, category=""):
    title = str(item.get("name") or "")
    handle = str(item.get("handle") or "")
    literature_link = f"{service.literature_origin}/handle/{quote(handle)}" if handle else ""
    publishing_date = str(item.get("lastModified") or "")[:10]
    metadata = metadata_to_dict(item.get("metadata"))
    bitstreams = item.get("bitstreams") or []
    authors = ensure_list(metadata.get("dc.contributor.author"))
    description = (
        metadata.get("dc.description.abstract")
        or metadata.get("dc.description")
        or metadata.get("dc.identifier.citation")
        or ""
    )
    issued = metadata.get("dc.date.issued")
    if issued:
        publishing_date = str(issued)

    download_link, download_size = pick_literature_download_bitstream(service, bitstreams)
    image_url = pick_literature_thumbnail(service, bitstreams)
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


def build_literature_item(item):
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


def build_literature_update_model(item):
    return LiteratureItem(
        id=item["id"],
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
