"""Представления для литературы."""

from django.db.models import Q
from django.http import JsonResponse

from ...common.decorators import allow_unverified_2fa
from ...common.utils import format_size, parse_pagination, parse_size
from ...models import LiteratureItem


def get_sqlite_connection(_db_name):
    return None


@allow_unverified_2fa
def get_literature(request):
    """Возвращает список литературы с пагинацией и фильтрацией."""
    if request.method != "GET":
        return JsonResponse({"detail": "Метод не разрешён"}, status=405)

    page, page_size = parse_pagination(request)
    search = (request.GET.get("search") or "").strip()
    categories = [value for value in request.GET.getlist("category") if value]
    sort_param = request.GET.get("sort", "default")

    test_connection = get_sqlite_connection("books/literature.db")
    if test_connection:
        where_conditions = []
        params = []

        if categories and "all" not in categories:
            placeholders = ",".join(["?" for _ in categories])
            where_conditions.append(f"category IN ({placeholders})")
            params.extend(categories)

        if search:
            search_conditions = []
            for term in search.split():
                if term:
                    pattern = f"%{term}%"
                    search_conditions.append(
                        "("
                        "title LIKE ? OR title LIKE ? OR title LIKE ? OR "
                        "authors LIKE ? OR authors LIKE ? OR authors LIKE ? OR "
                        "description LIKE ? OR description LIKE ? OR description LIKE ?"
                        ")"
                    )
                    params.extend([pattern.lower(), pattern.upper(), pattern.title()] * 3)
            if search_conditions:
                where_conditions.append("(" + " OR ".join(search_conditions) + ")")

        where_clause = f"WHERE {' AND '.join(where_conditions)}" if where_conditions else ""
        order_clause = {
            "title_asc": "ORDER BY title ASC",
            "title_desc": "ORDER BY title DESC",
            "year_desc": "ORDER BY publishing_date DESC",
            "year_asc": "ORDER BY publishing_date ASC",
            "category_asc": "ORDER BY category ASC",
            "category_desc": "ORDER BY category DESC",
        }.get(sort_param, "ORDER BY title ASC")

        with test_connection as cursor:
            cursor.execute(f"SELECT COUNT(*) FROM literature {where_clause}", params)
            total = cursor.fetchone()[0]
            offset = (page - 1) * page_size
            cursor.execute(
                f"""
                SELECT rowid, title, faculty, category, authors, publishing_date,
                       description, image_url, download_size, download_link
                FROM literature
                {where_clause}
                {order_clause}
                LIMIT {page_size} OFFSET {offset}
                """,
                params,
            )
            rows = cursor.fetchall()

        items = [
            {
                "id": rowid,
                "title": title or "",
                "author": authors or "",
                "description": description or "",
                "category": category or "",
                "year": publishing_date or "",
                "faculty": faculty or "",
                "downloadUrl": download_link or "",
                "downloadSize": format_size(download_size),
                "image_url": image_url or "",
            }
            for rowid, title, faculty, category, authors, publishing_date, description, image_url, download_size, download_link in rows
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

    queryset = LiteratureItem.objects.all()

    if categories and "all" not in categories:
        queryset = queryset.filter(category__in=categories)

    if search:
        query = Q()
        for term in search.split():
            if term:
                query |= (
                    Q(title__icontains=term)
                    | Q(authors__icontains=term)
                    | Q(description__icontains=term)
                )
        queryset = queryset.filter(query)

    if sort_param == "title_desc":
        queryset = queryset.order_by("-title")
    elif sort_param == "year_desc":
        queryset = queryset.order_by("-publishing_date", "title")
    elif sort_param == "year_asc":
        queryset = queryset.order_by("publishing_date", "title")
    elif sort_param == "category_asc":
        queryset = queryset.order_by("category", "title")
    elif sort_param == "category_desc":
        queryset = queryset.order_by("-category", "title")
    else:
        queryset = queryset.order_by("title")

    total = queryset.count()

    if sort_param in {"size_desc", "size_asc"}:
        reverse = sort_param == "size_desc"
        all_items = sorted(
            queryset,
            key=lambda item: parse_size(item.download_size or "0"),
            reverse=reverse,
        )
        rows = all_items[(page - 1) * page_size: page * page_size]
    else:
        offset = (page - 1) * page_size
        rows = list(queryset[offset:offset + page_size])

    items = [
        {
            "id": item.id,
            "title": item.title or "",
            "author": item.authors or "",
            "description": item.description or "",
            "category": item.category or "",
            "year": item.publishing_date or "",
            "faculty": item.faculty or "",
            "downloadUrl": item.download_link or "",
            "downloadSize": format_size(item.download_size),
            "image_url": item.image_url or "",
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
