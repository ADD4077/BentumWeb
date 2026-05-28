import asyncio
import re

import aiohttp
import bs4


async def collect_schedule(service):
    connector = aiohttp.TCPConnector(limit=40, limit_per_host=10)
    timeout = aiohttp.ClientTimeout(total=30)
    entries = []
    seen_entries = set()

    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        for faculty in service.schedule_faculties:
            endpoint = f"https://bntu.by/raspisanie/{faculty}"
            groups = await service._fetch_schedule_groups(session, endpoint)
            for index in range(0, len(groups), 20):
                batch = groups[index:index + 20]
                results = await asyncio.gather(
                    *[service._fetch_schedule_table(session, endpoint, group) for group in batch],
                    return_exceptions=True,
                )
                for group, result in zip(batch, results):
                    if isinstance(result, Exception) or not result:
                        continue
                    for entry in service._extract_schedule_entries(group, result):
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


def dedupe_schedule_entries(entries):
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


async def fetch_schedule_groups(service, session, endpoint):
    async def fetch_group_markup():
        async with session.get(endpoint, ssl=False) as response:
            if response.status != 200:
                raise RuntimeError(f"Schedule groups request returned HTTP {response.status} for {endpoint}")
            return await response.text()

    try:
        async for attempt in service._async_retry_policy(
            service.SCHEDULE_REQUEST_RETRIES,
            service.SCHEDULE_RETRY_DELAY_SECONDS,
            (aiohttp.ClientError, asyncio.TimeoutError, RuntimeError),
        ):
            with attempt:
                markup = await fetch_group_markup()
                break
    except (aiohttp.ClientError, asyncio.TimeoutError, RuntimeError):
        return []

    soup = bs4.BeautifulSoup(markup, "html.parser")
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
            if value and value != service.schedule_group_placeholder and value not in seen_groups:
                seen_groups.add(value)
                groups.append(value)
    return groups


async def fetch_schedule_table(service, session, endpoint, group):
    headers = {"cookie": f"group={group};"}

    async def fetch_table_markup():
        async with session.get(endpoint + "/table", headers=headers, ssl=False) as response:
            if response.status != 200:
                raise RuntimeError(f"Schedule table request returned HTTP {response.status} for {group}")
            return await response.text()

    try:
        async for attempt in service._async_retry_policy(
            service.SCHEDULE_REQUEST_RETRIES,
            service.SCHEDULE_RETRY_DELAY_SECONDS,
            (aiohttp.ClientError, asyncio.TimeoutError, RuntimeError),
        ):
            with attempt:
                markup = await fetch_table_markup()
                return bs4.BeautifulSoup(markup, "html.parser")
    except (aiohttp.ClientError, asyncio.TimeoutError, RuntimeError):
        return None


def extract_schedule_entries(service, group, soup):
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
            matter = service.schedule_pattern.sub(
                lambda match: f"({service.schedule_replacements[match.group(1).capitalize()]})",
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
