"""Представления для новостей."""

from django.db.models import Q
from django.http import JsonResponse

from ...common.decorators import allow_unverified_2fa
from ...common.utils import parse_pagination, parse_tags
from ...models import NewsItem


def get_sqlite_connection(_db_name):
    return None


def _build_category_filter(category):
    if not category or category == "all":
        return Q()

    mapping = {
        "academic": Q(tags__icontains="Преподаватели БНТУ") | Q(tags__icontains="БНТУ"),
        "achievements": Q(tags__icontains="Спорт") | Q(tags__icontains="Культура"),
        "education": Q(tags__icontains="Студенты"),
        "events": Q(tags__icontains="Мероприятие") | Q(tags__icontains="Преподаватели БНТУ"),
        "sports": Q(tags__icontains="Спорт"),
    }
    return mapping.get(category, Q())


def _detect_category(item, requested_category):
    if requested_category and requested_category != "all":
        return requested_category

    tag_words = [word.strip().replace("#", "").lower() for word in (item.tags or "").split(",")]
    if "студенты" in tag_words:
        return "education"
    if "мероприятие" in tag_words:
        return "events"
    if "спорт" in tag_words:
        return "sports"
    if "культура" in tag_words:
        return "achievements"
    if "преподаватели бнту" in tag_words or "бнту" in tag_words:
        return "academic"
    return "general"


@allow_unverified_2fa
def get_news(request):
    """Возвращает список новостей с пагинацией и фильтрацией."""
    if request.method != "GET":
        return JsonResponse({"detail": "Метод не разрешён"}, status=405)

    page, page_size = parse_pagination(request)
    search = (request.GET.get("search") or "").strip()
    category = (request.GET.get("category") or "").strip()
    sort_by = (request.GET.get("sort") or request.GET.get("sort_by") or "date_desc").strip()

    test_connection = get_sqlite_connection("news/times_news.db")
    if test_connection:
        where_conditions = []
        params = []

        category_filter = _build_category_filter(category)
        if category_filter:
            if category == "academic":
                where_conditions.append("(tags LIKE ? OR tags LIKE ?)")
                params.extend(["%Преподаватели БНТУ%", "%БНТУ%"])
            elif category == "achievements":
                where_conditions.append("(tags LIKE ? OR tags LIKE ?)")
                params.extend(["%Спорт%", "%Культура%"])
            elif category == "education":
                where_conditions.append("(tags LIKE ?)")
                params.append("%Студенты%")
            elif category == "events":
                where_conditions.append("(tags LIKE ? OR tags LIKE ?)")
                params.extend(["%Мероприятие%", "%Преподаватели БНТУ%"])
            elif category == "sports":
                where_conditions.append("(tags LIKE ?)")
                params.append("%Спорт%")

        if search:
            search_conditions = []
            for term in search.split():
                if term:
                    pattern = f"%{term}%"
                    search_conditions.append("(LOWER(title) LIKE ? OR LOWER(summary) LIKE ? OR LOWER(tags) LIKE ?)")
                    params.extend([pattern, pattern, pattern])
            if search_conditions:
                where_conditions.append("(" + " OR ".join(search_conditions) + ")")

        where_clause = f"WHERE {' AND '.join(where_conditions)}" if where_conditions else ""
        order_by = {
            "date_desc": "timestamp DESC",
            "date_asc": "timestamp ASC",
            "title_asc": "title ASC",
            "title_desc": "title DESC",
        }.get(sort_by, "timestamp DESC")

        with test_connection as cursor:
            cursor.execute(f"SELECT COUNT(*) FROM news {where_clause}", params)
            total = cursor.fetchone()[0]
            offset = (page - 1) * page_size
            cursor.execute(
                f"""
                SELECT id, title, link, date, summary, tags, image_url, reading_time, timestamp
                FROM news
                {where_clause}
                ORDER BY {order_by}
                LIMIT {page_size} OFFSET {offset}
                """,
                params,
            )
            rows = cursor.fetchall()

        items = [
            {
                "id": news_id,
                "title": title or "",
                "excerpt": summary or "",
                "content": summary or "",
                "category": "general",
                "tags": parse_tags(tags),
                "author": "БНТУ",
                "date": date,
                "timestamp": timestamp,
                "imageUrl": image_url or "",
                "link": link or "",
                "featured": False,
                "readTime": f"{reading_time or 5} мин",
            }
            for news_id, title, link, date, summary, tags, image_url, reading_time, timestamp in rows
        ]
        return JsonResponse(
            {
                "success": True,
                "page": page,
                "page_size": page_size,
                "total": total,
                "items": items,
            },
            status=200,
            json_dumps_params={"ensure_ascii": False},
        )

    queryset = NewsItem.objects.all()
    category_filter = _build_category_filter(category)
    if category_filter:
        queryset = queryset.filter(category_filter)

    if search:
        search_query = Q()
        for term in search.split():
            if term:
                search_query |= (
                    Q(title__icontains=term)
                    | Q(summary__icontains=term)
                    | Q(tags__icontains=term)
                )
        queryset = queryset.filter(search_query)

    order_map = {
        "date_desc": "-timestamp",
        "date_asc": "timestamp",
        "title_asc": "title",
        "title_desc": "-title",
    }
    queryset = queryset.order_by(order_map.get(sort_by, "-timestamp"))

    total = queryset.count()
    offset = (page - 1) * page_size
    rows = list(queryset[offset:offset + page_size])

    items = [
        {
            "id": item.id,
            "title": item.title or "",
            "excerpt": item.summary or "",
            "content": item.summary or "",
            "category": _detect_category(item, category),
            "tags": parse_tags(item.tags),
            "author": "БНТУ",
            "date": item.date,
            "timestamp": item.timestamp,
            "imageUrl": item.image_url or "",
            "link": item.link or "",
            "featured": False,
            "readTime": f"{item.reading_time or 5} мин",
        }
        for item in rows
    ]

    return JsonResponse(
        {
            "success": True,
            "page": page,
            "page_size": page_size,
            "total": total,
            "items": items,
        },
        status=200,
        json_dumps_params={"ensure_ascii": False},
    )
