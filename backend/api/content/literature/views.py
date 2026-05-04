"""Views for literature content."""

from django.db.models import Count, Q
from django.http import JsonResponse

from ...common.utils import format_size, parse_pagination, parse_size
from ...models import LiteratureItem
from ...content_parser_service import LITERATURE_TOP_LEVEL_SECTIONS


def get_literature(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Метод не разрешён"}, status=405)

    page, page_size = parse_pagination(request)
    search = (request.GET.get("search") or "").strip()
    categories = [value for value in request.GET.getlist("category") if value]
    sort_param = request.GET.get("sort", "default")

    allowed_categories = list(LITERATURE_TOP_LEVEL_SECTIONS.keys())
    queryset = LiteratureItem.objects.filter(category__in=allowed_categories)

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
    category_counts = {
        row["category"]: row["count"]
        for row in LiteratureItem.objects.filter(category__in=allowed_categories)
        .values("category")
        .annotate(count=Count("id"))
    }
    category_options = [
        {
            "id": name,
            "name": name,
            "count": category_counts.get(name, 0),
        }
        for name in LITERATURE_TOP_LEVEL_SECTIONS.keys()
    ]
    available_categories = [option["name"] for option in category_options]

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
            "available_categories": available_categories,
            "category_options": category_options,
            "items": items,
        },
        status=200,
        json_dumps_params={"ensure_ascii": False},
    )
