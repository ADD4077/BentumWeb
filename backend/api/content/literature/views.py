"""Views for literature content."""

from django.db.models import Count
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status
from rest_framework.generics import GenericAPIView
from rest_framework.response import Response

from ...common.utils import parse_pagination, parse_size
from ...models import LiteratureItem
from .filters import LiteratureItemFilter
from .helpers import get_allowed_categories, repair_mojibake
from .serializers import LiteratureItemSerializer


class LiteratureListView(GenericAPIView):
    serializer_class = LiteratureItemSerializer
    queryset = LiteratureItem.objects.all()
    filter_backends = [DjangoFilterBackend]
    filterset_class = LiteratureItemFilter

    def get_base_queryset(self):
        allowed_categories = get_allowed_categories()
        return self.get_queryset().filter(category__in=allowed_categories)

    def get_sorted_queryset(self, queryset, sort_param):
        if sort_param == "title_desc":
            return queryset.order_by("-title")
        if sort_param == "year_desc":
            return queryset.order_by("-publishing_date", "title")
        if sort_param == "year_asc":
            return queryset.order_by("publishing_date", "title")
        if sort_param == "category_asc":
            return queryset.order_by("category", "title")
        if sort_param == "category_desc":
            return queryset.order_by("-category", "title")
        return queryset.order_by("title")

    def get(self, request, *args, **kwargs):
        page, page_size = parse_pagination(request)
        sort_param = request.query_params.get("sort", "default")
        allowed_categories = get_allowed_categories()

        base_queryset = self.get_base_queryset()
        filtered_queryset = self.filter_queryset(base_queryset)
        total = filtered_queryset.count()

        category_counts = {
            row["category"]: row["count"]
            for row in base_queryset.values("category").annotate(count=Count("id"))
        }
        category_options = [
            {
                "id": name,
                "name": repair_mojibake(name),
                "count": category_counts.get(name, 0),
            }
            for name in allowed_categories
        ]
        available_categories = [option["name"] for option in category_options]

        if sort_param in {"size_desc", "size_asc"}:
            reverse = sort_param == "size_desc"
            sorted_items = sorted(
                filtered_queryset,
                key=lambda item: parse_size(item.download_size or "0"),
                reverse=reverse,
            )
            rows = sorted_items[(page - 1) * page_size: page * page_size]
        else:
            sorted_queryset = self.get_sorted_queryset(filtered_queryset, sort_param)
            offset = (page - 1) * page_size
            rows = list(sorted_queryset[offset:offset + page_size])

        serializer = self.get_serializer(rows, many=True)
        return Response(
            {
                "success": True,
                "page": page,
                "page_size": page_size,
                "total": total,
                "available_categories": available_categories,
                "category_options": category_options,
                "items": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


get_literature = LiteratureListView.as_view()
