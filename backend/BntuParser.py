from aiogram.utils.keyboard import InlineKeyboardMarkup
from aiogram.utils.media_group import MediaGroupBuilder
from aiogram import types
from aiogram.exceptions import TelegramBadRequest

from typing import Union, Any, Optional
import requests
import json
import bs4
import re
import math
from datetime import datetime
import os
import aiosqlite
import asyncio
import aiohttp
from tqdm import tqdm
import sys

literature_per_faculty = {
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
    "fms": "https://rep.bntu.by/handle/data/88"
}

requests.packages.urllib3.disable_warnings()

from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

session = requests.Session()
retries = Retry(total=3, backoff_factor=0.5, status_forcelist=[502, 503, 504])
session.mount("https://", HTTPAdapter(max_retries=retries))


def safe_get(url, **kwargs):
    try:
        return session.get(url, timeout=10, **kwargs)
    except requests.exceptions.RequestException as e:
        print(f"network error fetching {url}: {e}")
        return None


def next_element(element):
    return element.next_sibling.next_sibling


def get_books_count() -> int:
    """
    returns amount of books in BNTU repository
    """
    response = safe_get("https://rep.bntu.by/")
    if not response:
        return 0
    soup = bs4.BeautifulSoup(response.text)
    a_element = soup.find("a", href_="/handle/data/62")
    return next_element(a_element).text


async def init_literature_database():
    """Initialize database for literature storage"""
    async with aiosqlite.connect("./books/literature.db") as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS literature (
                title TEXT NOT NULL,
                faculty TEXT,
                category TEXT,
                authors TEXT,
                publishing_date TEXT,
                description TEXT,
                image_url TEXT,
                download_size TEXT,
                download_link TEXT,
                UNIQUE(title, faculty, category)
            )
        """)
        await db.commit()


async def fetch_literature_details(session, title, literature_link):
    """Fetch details for a single literature item"""
    try:
        async with session.get(literature_link, ssl=False) as response:
            if response.status == 200:
                content = await response.text()
                soup = bs4.BeautifulSoup(content, "html.parser")
                
                # Extract download info
                i_element = soup.find("i", class_="glyphicon-file")
                size = "0"
                filetype = "N/A"
                download_link = "Not found"
                
                if i_element:
                    a_element = i_element.find_parent("a")
                    if a_element:
                        size = a_element.text.split(" (")[1].replace(")", "")
                        filetype = a_element.text.split(" (")[0].lstrip()
                        download_link = "https://rep.bntu.by" + a_element["href"]
                
                return title, size, filetype, download_link
    except Exception as e:
        print(f"Error fetching literature details for {title}: {e}")
    
    return title, "0", "N/A", "Not found"


async def parse_literature() -> None:
    """
    Parses literature with async requests and saves to aiosqlite database
    """
    if not literature_per_faculty:
        print("⚠️  Парсинг литературы пропущен: нет данных о факультетах")
        return None
        
    # Clear console for clean output
    os.system('cls' if os.name == 'nt' else 'clear')
    print("📚 Парсер литературы БНТУ")
    print("=" * 50)
    
    await init_literature_database()
    
    # Configure aiohttp session
    connector = aiohttp.TCPConnector(limit=50, limit_per_host=10)
    timeout = aiohttp.ClientTimeout(total=30)
    
    total_literature = 0
    total_faculties = len(literature_per_faculty)
    
    # Create progress bar for faculties
    faculty_pbar = tqdm(literature_per_faculty.items(), desc="🏛️  Парсинг факультетов", unit="faculty", position=0, leave=True)
    
    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        async with aiosqlite.connect("./books/literature.db") as db:
            for faculty, endpoint in faculty_pbar:
                faculty_literature = 0
                
                async with session.get(endpoint, ssl=False) as response:
                    if response.status != 200:
                        continue
                    
                    content = await response.text()
                    soup = bs4.BeautifulSoup(content, "html.parser")
                    collections = soup.find_all("h4", class_="artifact-title")
                    
                    # Create progress bar for collections
                    collection_pbar = tqdm(collections, desc=f"📖 {faculty.upper()} коллекции", unit="coll", position=1, leave=False)
                    
                    for collection in collection_pbar:
                        children = collection.find_all(recursive=False)
                        link_element = children[0]
                        if link_element.find_all("span", recursive=False):
                            link = (
                                "https://rep.bntu.by"
                                + link_element["href"]
                                + "/browse?rpp=9999&sort_by=1&type=title"
                            )
                            collection_title = link_element.find_all(recursive=False)[0].text
                            
                            # Fetch collection page
                            async with session.get(link, ssl=False) as collection_response:
                                if collection_response.status == 200:
                                    collection_content = await collection_response.text()
                                    collection_soup = bs4.BeautifulSoup(collection_content, "html.parser")
                                    rows = collection_soup.find_all("div", class_="item-wrapper")
                                    
                                    # Prepare items for batch processing
                                    literature_items = []
                                    for row in rows:
                                        a_element = row.find("h4", class_="artifact-title").find("a")
                                        title = a_element.text
                                        literature_link = "https://rep.bntu.by" + a_element["href"]
                                        
                                        # Extract basic info
                                        faculty_ru = {
                                            "atf": "АПФ", "fgde": "ФГДИЭ", "msf": "МСФ", "mtf": "МТФ",
                                            "fmmp": "ФММП", "ef": "ЭФ", "fitr": "ФИТР", "ftug": "ФТУГ",
                                            "ipf": "ИПФ", "fes": "ФЭС", "af": "АФ", "sf": "СФ",
                                            "psf": "ПСФ", "ftk": "ФТК", "vtf": "ВТФ", "stf": "СТФ", "fms": "ФМС"
                                        }
                                        
                                        # Extract image
                                        image_element = row.find("img", class_=["img-responsive", "img-thumbnail"])
                                        image_link = "https://rep.bntu.by" + image_element["src"] if image_element and image_element.get("src") else None
                                        
                                        # Extract authors
                                        authors = row.find("span", class_="author").small.find_all("span")
                                        authors_list = [author.text.replace(",", "") for author in authors]
                                        
                                        publishing_date = row.find("span", class_="date").text
                                        description = row.find("div", class_="artifact-abstract").text
                                        
                                        literature_items.append((
                                            title, faculty_ru[faculty], collection_title,
                                            ",".join(authors_list), publishing_date, description,
                                            image_link, literature_link
                                        ))
                                    
                                    # Process literature items in batches
                                    batch_size = 50
                                    collection_count = 0
                                    
                                    # Create progress bar for batches
                                    batch_pbar = tqdm(range(0, len(literature_items), batch_size), 
                                                   desc=f"📄 {collection_title[:20]}...", unit="batch", position=2, leave=False)
                                    
                                    for i in batch_pbar:
                                        batch = literature_items[i:i+batch_size]
                                        
                                        # Create tasks for parallel processing
                                        tasks = []
                                        for title, faculty_name, category, authors, pub_date, desc, image_url, lit_link in batch:
                                            task = fetch_literature_details(session, title, lit_link)
                                            tasks.append((task, title, faculty_name, category, authors, pub_date, desc, image_url))
                                        
                                        # Execute tasks in parallel
                                        if tasks:
                                            task_results = await asyncio.gather(*[task for task, *_ in tasks], return_exceptions=True)
                                            
                                            # Check for duplicates after fetching results
                                            task_data = [data for _, *data in tasks]
                                            
                                            # Save results to database
                                            for j, result in enumerate(task_results):
                                                if isinstance(result, Exception):
                                                    continue
                                                
                                                _, size, filetype, download_link = result
                                                title, faculty_name, category, authors, pub_date, desc, image_url = task_data[j]
                                                
                                                # Check if already exists before inserting
                                                cursor = await db.execute(
                                                    "SELECT title FROM literature WHERE title = ? AND faculty = ? AND category = ?",
                                                    (title, faculty_name, category)
                                                )
                                                if not await cursor.fetchone():
                                                    await db.execute("""
                                                        INSERT INTO literature (
                                                            title, faculty, category, authors, publishing_date,
                                                            description, image_url, download_size, download_link
                                                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                                                    """, (title, faculty_name, category, authors, pub_date, desc, image_url, size, download_link))
                                                    
                                                    collection_count += 1
                                                    total_literature += 1
                                            
                                            # Commit after each batch to prevent locking
                                            await db.commit()
                                        
                                        # Small delay between batches
                                        await asyncio.sleep(0.05)
                                    
                                    batch_pbar.close()
                                    faculty_literature += collection_count
                    
                    collection_pbar.close()
                    # Update faculty progress
                    faculty_pbar.set_postfix({"items": faculty_literature, "total": total_literature})
                    
                    # Small delay between collections
                    await asyncio.sleep(0.1)
    
    # Close progress bars
    faculty_pbar.close()
    print()
    print(f"✅ Парсинг литературы завершен! Всего элементов: {total_literature}")
    return None


async def init_database():
    """Initialize database for news storage"""
    async with aiosqlite.connect("./news/times_news.db") as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS news (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                link TEXT UNIQUE NOT NULL,
                date TEXT,
                timestamp INTEGER,
                summary TEXT,
                tags TEXT,
                image_url TEXT,
                reading_time INTEGER
            )
        """)
        await db.commit()


async def fetch_news_details(session, title, full_link):
    """Fetch details for a single news article"""
    try:
        async with session.get(full_link, ssl=False) as response:
            if response.status == 200:
                content = await response.text()
                detail_soup = bs4.BeautifulSoup(content, "html.parser")
                
                # Extract date
                date_element = (detail_soup.find("div", class_="newsDate") or
                              detail_soup.find("time") or 
                              detail_soup.find("span", class_="date") or 
                              detail_soup.find("div", class_="date"))
                
                date = ""
                if date_element:
                    date = date_element.text.strip()
                    date = re.sub(r"<i[^>]*>.*?</i>", "", date)
                    date = re.sub(r"fas fa-calendar-alt", "", date)
                    date = re.sub(r"\s+", " ", date)
                    date = date.strip()
                
                # Extract summary
                summary = ""
                content_selectors = [
                    "div.article-content", "div.news-content", "div.content", 
                    "div.text", "article p", ".field--name-body p", ".node__content p"
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
                    all_paragraphs = detail_soup.find_all("p")
                    for p in all_paragraphs:
                        p_text = p.text.strip()
                        if len(p_text) > 30 and "БНТУ – лидер технического образования" not in p_text:
                            summary = p_text[:200] + "..." if len(p_text) > 200 else p_text
                            break
                
                # Extract main news image (not banner)
                image_url = ""
                
                # Try to find main image in article content first
                content_selectors = [
                    "div.article-content img", "div.news-content img", "div.content img",
                    "article img", ".field--name-body img", ".node__content img"
                ]
                
                for selector in content_selectors:
                    img_element = detail_soup.select_one(selector)
                    if img_element and img_element.get("src"):
                        img_src = img_element["src"]
                        if img_src.startswith("/"):
                            image_url = f"https://times.bntu.by{img_src}"
                        else:
                            image_url = img_src
                        break
                
                # If no image found in content, try other common selectors
                if not image_url:
                    # Look for image with specific classes or in specific containers
                    image_selectors = [
                        "img.news-image", "img.article-image", "img.main-image",
                        "div.news img:first-child", "div.article img:first-child",
                        ".field--name-field-image img", ".news__image img"
                    ]
                    
                    for selector in image_selectors:
                        img_element = detail_soup.select_one(selector)
                        if img_element and img_element.get("src"):
                            img_src = img_element["src"]
                            # Skip banner/icon images
                            if not any(skip in img_src.lower() for skip in ['banner', 'logo', 'icon', 'avatar']):
                                if img_src.startswith("/"):
                                    image_url = f"https://times.bntu.by{img_src}"
                                else:
                                    image_url = img_src
                                break
                
                # Last resort: use any meaningful image (exclude small/banner images)
                if not image_url:
                    all_images = detail_soup.find_all("img")
                    for img in all_images:
                        if img.get("src"):
                            img_src = img["src"]
                            # Skip common banner/ad images
                            if not any(skip in img_src.lower() for skip in ['banner', 'logo', 'icon', 'avatar', 'ad']):
                                # Prefer larger images (skip very small ones)
                                if img.get("width") and int(img.get("width", 0)) > 200:
                                    if img_src.startswith("/"):
                                        image_url = f"https://times.bntu.by{img_src}"
                                    else:
                                        image_url = img_src
                                    break
                
                # Calculate reading time with 220 words per minute for all content
                all_text = detail_soup.get_text()
                word_count = len(all_text.split())
                
                # Reading time calculation - 220 words per minute standard
                reading_time = math.ceil(word_count / 220)
                
                # Ensure minimum 1 minute
                reading_time = max(1, reading_time)
                
                return title, full_link, date, summary, image_url, reading_time
    except Exception as e:
        print(f"Error fetching details for {title}: {e}")
    
    return title, full_link, "", "", "", 1


async def parse_times_news() -> None:
    """
    Parses all news from https://times.bntu.by with pagination and async requests
    Filters out news older than 2 years
    Stops parsing after 3 consecutive old news are found
    """
    # Clear console for clean output
    os.system('cls' if os.name == 'nt' else 'clear')
    print("🔍 Парсер новостей БНТУ")
    print("=" * 50)
    
    await init_database()
    
    base_url = "https://times.bntu.by"
    total_news = 0
    skipped_old = 0
    consecutive_old = 0  # Counter for consecutive old news
    MAX_CONSECUTIVE_OLD = 3  # Stop after 3 old news in a row
    
    # Calculate date threshold (2 years ago from today)
    from datetime import datetime, timedelta
    date_threshold = datetime.now() - timedelta(days=730)  # 2 years = 730 days
    
    # First, get total number of pages
    response = safe_get(f"{base_url}/times", verify=False)
    if not response:
        print("❌ Не удалось загрузить главную страницу times.bntu.by")
        return None
    
    soup = bs4.BeautifulSoup(response.content, "html.parser")
    
    # Find pagination info
    pagination = soup.find("ul", class_="pagination")
    max_page = 1
    if pagination:
        page_links = pagination.find_all("a")
        for link in page_links:
            href = link.get("href", "")
            if "page=" in href:
                page_num = int(href.split("page=")[1])
                max_page = max(max_page, page_num)
    
    print(f"📄 Найдено страниц для парсинга: {max_page}")
    print(f"📅 Фильтр: новости новее {date_threshold.strftime('%d.%m.%Y')}")
    print(f"🛑 Остановка после {MAX_CONSECUTIVE_OLD} старых новостей подряд")
    print()
    
    # Configure aiohttp session
    connector = aiohttp.TCPConnector(limit=50, limit_per_host=10)
    timeout = aiohttp.ClientTimeout(total=30)
    
    # Create progress bar for pages
    page_pbar = tqdm(range(1, max_page + 1), desc="📖 Парсинг страниц", unit="page", position=0, leave=True)
    
    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        # Parse all pages
        for page in page_pbar:
            page_url = f"{base_url}/times?page={page}"
            
            response = safe_get(page_url, verify=False)
            if not response:
                continue
            
            soup = bs4.BeautifulSoup(response.content, "html.parser")
            
            # Find all news links
            news_links = soup.find_all("a", href=lambda x: x and "/news/" in x and "/news/tag/" not in x)
            
            # Prepare news items for batch processing
            news_items = []
            for link_element in news_links:
                title = link_element.text.strip()
                link = link_element.get("href", "")
                
                if not title or not link or title.startswith("#"):
                    continue
                
                if link.startswith("/"):
                    full_link = f"{base_url}{link}"
                else:
                    full_link = link
                
                # Extract tags
                tags = []
                parent = link_element.parent
                if parent:
                    tag_elements = parent.find_all("a", href=lambda x: x and "/news/tag/" in x)
                    for tag_elem in tag_elements:
                        tag_text = tag_elem.text.strip()
                        if tag_text.startswith("#"):
                            tags.append(tag_text)
                
                news_items.append((title, full_link, tags))
            
            # Process news items in batches
            batch_size = 20
            page_news_count = 0
            
            async with aiosqlite.connect("./news/times_news.db") as db:
                # Create progress bar for news items on this page
                news_pbar = tqdm(range(0, len(news_items), batch_size), 
                               desc=f"📰 Page {page} news", unit="batch", position=1, leave=False)
                
                for i in news_pbar:
                    batch = news_items[i:i+batch_size]
                    
                    # Create tasks for parallel processing
                    tasks = []
                    for title, full_link, tags in batch:
                        # Check if already exists
                        cursor = await db.execute("SELECT id FROM news WHERE link = ?", (full_link,))
                        if not await cursor.fetchone():
                            task = fetch_news_details(session, title, full_link)
                            tasks.append((task, tags))
                    
                    # Execute tasks in parallel
                    if tasks:
                        results = await asyncio.gather(*[task for task, _ in tasks], return_exceptions=True)
                        
                        # Save results to database
                        for i, result in enumerate(results):
                            if isinstance(result, Exception):
                                continue
                            
                            title, full_link, date, summary, image_url, reading_time = result
                            tags = tasks[i][1]
                            
                            # Parse and filter news by date (skip if older than 2 years or no date)
                            news_date = None
                            timestamp = None
                            if date:
                                # Try to parse Russian date formats
                                try:
                                    # Remove extra spaces and clean up
                                    clean_date = re.sub(r'\s+', ' ', date.strip())
                                    
                                    # Common Russian date patterns
                                    patterns = [
                                        r'(\d{1,2})\s+(\w+)\s+(\d{4})\s+(\d{1,2}):(\d{2})',  # "28 февраля 2026 19:33"
                                        r'(\d{1,2})\s+(\w+)\s+(\d{4})',  # "1 января 2023"
                                        r'(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})',  # "28.02.2026 19:33"
                                        r'(\d{1,2})\.(\d{1,2})\.(\d{4})',  # "01.01.2023"
                                        r'(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})',  # "2026-02-28 19:33"
                                        r'(\d{4})-(\d{1,2})-(\d{1,2})',  # "2023-01-01"
                                    ]
                                    
                                    for pattern in patterns:
                                        match = re.search(pattern, clean_date)
                                        if match:
                                            if pattern == patterns[0] or pattern == patterns[2] or pattern == patterns[4]:  # With time
                                                if pattern == patterns[0]:  # "28 февраля 2026 19:33"
                                                    day, month_name, year, hour, minute = match.groups()
                                                elif pattern == patterns[2]:  # "28.02.2026 19:33"
                                                    day, month, year, hour, minute = match.groups()
                                                elif pattern == patterns[4]:  # "2026-02-28 19:33"
                                                    year, month, day, hour, minute = match.groups()
                                                
                                                # Convert month name to number for Russian format
                                                if pattern == patterns[0]:
                                                    month_map = {
                                                        'января': 1, 'февраля': 2, 'марта': 3, 'апреля': 4,
                                                        'мая': 5, 'июня': 6, 'июля': 7, 'августа': 8,
                                                        'сентября': 9, 'октября': 10, 'ноября': 11, 'декабря': 12
                                                    }
                                                    month = month_map.get(month_name.lower(), 1)
                                                
                                                news_date = datetime(int(year), int(month), int(day), int(hour), int(minute))
                                                break
                                            else:  # Without time
                                                if pattern == patterns[1]:  # "1 января 2023"
                                                    day, month_name, year = match.groups()
                                                    month_map = {
                                                        'января': 1, 'февраля': 2, 'марта': 3, 'апреля': 4,
                                                        'мая': 5, 'июня': 6, 'июля': 7, 'августа': 8,
                                                        'сентября': 9, 'октября': 10, 'ноября': 11, 'декабря': 12
                                                    }
                                                    month = month_map.get(month_name.lower(), 1)
                                                elif pattern == patterns[3]:  # "01.01.2023"
                                                    day, month, year = match.groups()
                                                elif pattern == patterns[5]:  # "2023-01-01"
                                                    year, month, day = match.groups()
                                                
                                                news_date = datetime(int(year), int(month), int(day))
                                                break
                                    
                                    # Convert to Unix timestamp (seconds)
                                    if news_date:
                                        timestamp = int(news_date.timestamp())
                                        
                                except:
                                    news_date = None
                                    timestamp = None
                            
                            # Skip news without date or older than 2 years
                            if not news_date or news_date < date_threshold:
                                if not news_date:
                                    skipped_old += 1  # Count as "old" for statistics
                                else:
                                    skipped_old += 1
                                
                                consecutive_old += 1  # Increment consecutive old counter
                                
                                # Stop parsing if we found 3 old news in a row
                                if consecutive_old >= MAX_CONSECUTIVE_OLD:
                                    print(f"\n🛑 Остановка парсинга: найдено {MAX_CONSECUTIVE_OLD} старых новостей подряд")
                                    page_pbar.close()
                                    print()
                                    print(f"✅ Парсинг завершен! Всего новостей: {total_news}")
                                    print(f"🚫 Пропущено старых новостей (>2 лет): {skipped_old}")
                                    print(f"⏹️  Остановлено после {consecutive_old} старых новостей подряд")
                                    return None
                                
                                continue
                            else:
                                consecutive_old = 0  # Reset counter when we find a valid news
                            
                            await db.execute("""
                                INSERT INTO news (title, link, date, timestamp, summary, tags, image_url, reading_time)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                            """, (title, full_link, date, timestamp, summary, ",".join(tags), image_url, reading_time))
                            
                            page_news_count += 1
                            total_news += 1
                    
                    # Small delay between batches
                    await asyncio.sleep(0.05)
                
                await db.commit()
            
            # Update page progress bar description
            page_pbar.set_postfix({"news": page_news_count, "total": total_news, "skipped": skipped_old, "consecutive_old": consecutive_old})
            
            # Small delay between pages
            await asyncio.sleep(0.1)
    
    # Close progress bars
    page_pbar.close()
    print()
    print(f"✅ Парсинг завершен! Всего новостей: {total_news}")
    print(f"🚫 Пропущено старых новостей (>2 лет): {skipped_old}")
    return None


async def init_schedule_database():
    """Initialize database for schedule storage"""
    async with aiosqlite.connect("./schedules/schedules.db") as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS schedules (
                group_number TEXT NOT NULL,
                week INTEGER NOT NULL,
                day TEXT NOT NULL,
                time TEXT NOT NULL,
                matter TEXT,
                teacher TEXT,
                frame TEXT,
                classroom TEXT
            )
        """)
        await db.commit()


async def fetch_schedule_table(session, endpoint, group):
    """Fetch schedule table for a specific group"""
    try:
        headers = {"cookie": f"group={group};"}
        async with session.get(endpoint + "/table", headers=headers, ssl=False) as response:
            if response.status == 200:
                content = await response.text()
                return bs4.BeautifulSoup(content, "html.parser")
    except Exception as e:
        print(f"Error fetching schedule for group {group}: {e}")
    return None


async def parse_schedule() -> None:
    """
    Parses schedules with async requests and saves to aiosqlite database
    """
    # Clear console for clean output
    os.system('cls' if os.name == 'nt' else 'clear')
    print("📅 Парсер расписаний БНТУ")
    print("=" * 50)
    
    await init_schedule_database()
    
    faculties = [
        "atf", "fgde", "msf", "mtf", "fmmp", "ef", "fitr", "ftug", 
        "ipf", "fes", "af", "sf", "psf", "ftk", "vtf", "stf"
    ]
    
    faculty_ru = {
        "atf": "АПФ", "fgde": "ФГДИЭ", "msf": "МСФ", "mtf": "МТФ",
        "fmmp": "ФММП", "ef": "ЭФ", "fitr": "ФИТР", "ftug": "ФТУГ",
        "ipf": "ИПФ", "fes": "ФЭС", "af": "АФ", "sf": "СФ",
        "psf": "ПСФ", "ftk": "ФТК", "vtf": "ВТФ", "stf": "СТФ"
    }
    
    replacements = {"Практ": "Практ.", "Лекц": "Лекц.", "Лаб": "Лаб."}
    pattern = re.compile(r"\(\s*(Практ|Лекц|Лаб)[^)]*\)", re.IGNORECASE)
    
    # Configure aiohttp session
    connector = aiohttp.TCPConnector(limit=50, limit_per_host=10)
    timeout = aiohttp.ClientTimeout(total=30)
    
    total_groups = 0
    
    # Create progress bar for faculties
    faculty_pbar = tqdm(faculties, desc="🏛️  Парсинг факультетов", unit="faculty", position=0, leave=True)
    
    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        async with aiosqlite.connect("./schedules/schedules.db") as db:
            for faculty in faculty_pbar:
                faculty_groups = 0
                endpoint = f"https://bntu.by/raspisanie/{faculty}"
                
                try:
                    async with session.get(endpoint, ssl=False) as response:
                        if response.status != 200:
                            continue
                        
                        content = await response.text()
                        soup = bs4.BeautifulSoup(content, "html.parser")
                        courses = soup.find_all("input", class_="course-checkbox")
                        groups = []
                        group_div = soup.find("div", attrs={"id": "group"})
                        
                        # Extract groups
                        for i in range(len(courses)):
                            select = group_div.find("select", attrs={"name": f"group{i + 1}"})
                            if select:
                                for child in select.find_all(recursive=False):
                                    if child["value"] != "Номер:":
                                        groups.append(child["value"])
                        
                        # Create progress bar for groups
                        group_pbar = tqdm(range(0, len(groups), 20), 
                                        desc=f"👥 {faculty_ru[faculty]} groups", unit="batch", position=1, leave=False)
                        
                        # Process groups in batches
                        for i in group_pbar:
                            batch = groups[i:i+20]
                            
                            # Create tasks for parallel processing
                            tasks = []
                            for group in batch:
                                task = fetch_schedule_table(session, endpoint, group)
                                tasks.append((task, group))
                            
                            # Execute tasks in parallel
                            if tasks:
                                task_results = [task for task, _ in tasks]
                                task_data = [data for _, data in tasks]
                                results = await asyncio.gather(*task_results, return_exceptions=True)
                                
                                # Process results
                                for j, result in enumerate(results):
                                    if isinstance(result, Exception):
                                        continue
                                    
                                    group = task_data[j]
                                    soup = result
                                    
                                    if soup:
                                        tables = soup.find_all("table", class_="sheduleTable")
                                        
                                        for week, table in enumerate(tables):
                                            if not table:
                                                continue
                                            
                                            rows = []
                                            if table.find("tbody"):
                                                rows = table.find("tbody").find_all("tr")
                                            else:
                                                rows = table.find_all("tr")
                                            
                                            current_day = None
                                            
                                            for row in rows:
                                                day_element = row.find("td", class_="newDay")
                                                if day_element:
                                                    current_day = day_element.text.replace("\n", "").replace(" ", "")
                                                
                                                time_element = row.find("td", class_="time")
                                                if not time_element:
                                                    continue
                                                
                                                time = time_element.text.strip()
                                                
                                                # Skip if time is empty or no current_day
                                                if not time or not current_day:
                                                    continue
                                                
                                                # Extract schedule data
                                                matter_element = time_element.next_sibling.next_sibling
                                                matter = matter_element.text.strip() if matter_element else ""
                                                matter = pattern.sub(
                                                    lambda match: f"({replacements[match.group(1).capitalize()]})",
                                                    matter,
                                                )
                                                
                                                # Skip if matter is empty
                                                if not matter:
                                                    continue
                                                
                                                teacher_element = matter_element.next_sibling.next_sibling if matter_element else None
                                                teacher = re.sub(r"\s+", " ", teacher_element.text).lstrip().rstrip() if teacher_element else ""
                                                
                                                frame_element = teacher_element.next_sibling.next_sibling if teacher_element else None
                                                frame = frame_element.text if frame_element else ""
                                                
                                                classroom_element = frame_element.next_sibling.next_sibling if frame_element else None
                                                classroom = classroom_element.text if classroom_element else ""
                                                
                                                # Insert into database
                                                await db.execute("""
                                                    INSERT OR REPLACE INTO schedules (
                                                        group_number, week, day, time, matter, teacher, frame, classroom
                                                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                                                """, (group, week, current_day, time, matter, teacher, frame, classroom))
                                        
                                        faculty_groups += 1
                                        total_groups += 1
                            
                            # Commit after each batch to save in real-time
                            await db.commit()
                            
                            # Small delay between batches
                            await asyncio.sleep(0.05)
                        
                        group_pbar.close()
                        # Update faculty progress
                        faculty_pbar.set_postfix({"groups": faculty_groups, "total": total_groups})
                        
                        # Small delay between faculties
                        await asyncio.sleep(0.1)
                        
                except Exception as e:
                    continue
    
    # Close progress bars
    faculty_pbar.close()
    print()
    print(f"✅ Парсинг расписаний завершен! Всего групп: {total_groups}")
    return None


async def show_group_schedule(group_number: str) -> None:
    """Display schedule for a specific group from database"""
    try:
        async with aiosqlite.connect("./schedules/schedules.db") as db:
            cursor = await db.execute("""
                SELECT week, day, time, matter, teacher, frame, classroom 
                FROM schedules 
                WHERE group_number = ? 
                ORDER BY week, day, time
            """, (group_number,))
            
            results = await cursor.fetchall()
            
            if not results:
                print(f"❌ Расписание для группы {group_number} не найдено")
                return
            
            print(f"📅 Расписание группы {group_number}")
            print("=" * 60)
            
            current_week = None
            current_day = None
            
            for week, day, time, matter, teacher, frame, classroom in results:
                if current_week != week:
                    if current_week is not None:
                        print()
                    print(f"\n📋 Неделя {week}")
                    current_week = week
                    current_day = None
                
                if current_day != day:
                    print(f"\n📅 {day}")
                    current_day = day
                
                print(f"  {time} | {matter}")
                if teacher:
                    print(f"         👨‍🏫 {teacher}")
                if classroom:
                    print(f"         🏢 {classroom}")
                if frame:
                    print(f"         📎 {frame}")
            
            print("\n" + "=" * 60)
            print(f"✅ Показано {len(results)} занятий")
            
    except Exception as e:
        print(f"❌ Ошибка при загрузке расписания: {e}")


async def show_menu() -> None:
    """Display interactive menu for parsers and data display"""
    while True:
        os.system('cls' if os.name == 'nt' else 'clear')
        print("🎓 БНТУ Парсер - Главное меню")
        print("=" * 50)
        print("1. 📚 Парсинг литературы")
        print("2. 📅 Парсинг расписаний")
        print("3. 🔍 Парсинг новостей")
        print("4. 📋 Показать расписание группы")
        print("5. 📊 Статистика баз данных")
        print("0. 🚪 Выход")
        print("=" * 50)
        
        choice = input("Выберите действие: ").strip()
        
        if choice == "1":
            os.system('cls' if os.name == 'nt' else 'clear')
            print("📚 Запуск парсера литературы...")
            print("=" * 50)
            await parse_literature()
            input("\nНажмите Enter для возврата в меню...")
            
        elif choice == "2":
            os.system('cls' if os.name == 'nt' else 'clear')
            print("📅 Запуск парсера расписаний...")
            print("=" * 50)
            await parse_schedule()
            input("\nНажмите Enter для возврата в меню...")
            
        elif choice == "3":
            os.system('cls' if os.name == 'nt' else 'clear')
            print("🔍 Запуск парсера новостей...")
            print("=" * 50)
            await parse_times_news()
            input("\nНажмите Enter для возврата в меню...")
            
        elif choice == "4":
            os.system('cls' if os.name == 'nt' else 'clear')
            print("📋 Показать расписание группы")
            print("=" * 50)
            group_number = input("Введите номер группы: ").strip()
            if group_number:
                print(f"\n📋 Загрузка расписания группы {group_number}...")
                await show_group_schedule(group_number)
            else:
                print("❌ Номер группы не указан")
            input("\nНажмите Enter для возврата в меню...")
            
        elif choice == "5":
            os.system('cls' if os.name == 'nt' else 'clear')
            await show_database_stats()
            input("\nНажмите Enter для возврата в меню...")
            
        elif choice == "0":
            os.system('cls' if os.name == 'nt' else 'clear')
            print("👋 До свидания!")
            print("=" * 50)
            break
            
        else:
            os.system('cls' if os.name == 'nt' else 'clear')
            print("❌ Неверный выбор. Попробуйте снова.")
            print("=" * 50)
            input("\nНажмите Enter для возврата в меню...")


async def show_database_stats() -> None:
    """Show statistics for all databases"""
    print("\n📊 Статистика баз данных")
    print("=" * 50)
    
    try:
        # Literature stats
        async with aiosqlite.connect("./books/literature.db") as db:
            cursor = await db.execute("SELECT COUNT(*) FROM literature")
            literature_count = (await cursor.fetchone())[0]
            print(f"📚 Литература: {literature_count} записей")
    except:
        print("📚 Литература: база данных не найдена")
    
    try:
        # News stats
        async with aiosqlite.connect("./news/times_news.db") as db:
            cursor = await db.execute("SELECT COUNT(*) FROM news")
            news_count = (await cursor.fetchone())[0]
            print(f"🔍 Новости: {news_count} записей")
    except:
        print("🔍 Новости: база данных не найдена")
    
    try:
        # Schedule stats
        async with aiosqlite.connect("./schedules/schedules.db") as db:
            cursor = await db.execute("SELECT COUNT(*) FROM schedules")
            schedule_count = (await cursor.fetchone())[0]
            cursor = await db.execute("SELECT COUNT(DISTINCT group_number) FROM schedules")
            groups_count = (await cursor.fetchone())[0]
            print(f"📅 Расписания: {schedule_count} записей")
            print(f"👥 Группы: {groups_count} групп")
    except:
        print("📅 Расписания: база данных не найдена")


async def main():
    """Main function to run interactive menu"""
    # Create directories if they don't exist
    os.makedirs("./books", exist_ok=True)
    os.makedirs("./news", exist_ok=True) 
    os.makedirs("./schedules", exist_ok=True)
    
    # Launch interactive menu
    await show_menu()


if __name__ == "__main__":
    asyncio.run(main())
