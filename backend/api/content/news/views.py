"""Views for news content."""

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status
from rest_framework.generics import GenericAPIView
from rest_framework.response import Response

from ...common.utils import parse_pagination
from ...models import NewsItem
from .filters import NewsItemFilter
from .serializers import NewsItemSerializer


class NewsListView(GenericAPIView):
    serializer_class = NewsItemSerializer
    queryset = NewsItem.objects.all()
    filter_backends = [DjangoFilterBackend]
    filterset_class = NewsItemFilter

    def get_queryset(self):
        queryset = super().get_queryset()
        sort_by = (self.request.query_params.get("sort") or self.request.query_params.get("sort_by") or "date_desc").strip()
        order_map = {
            "date_desc": "-timestamp",
            "date_asc": "timestamp",
            "title_asc": "title",
            "title_desc": "-title",
        }
        return queryset.order_by(order_map.get(sort_by, "-timestamp"))

    def get(self, request, *args, **kwargs):
        page, page_size = parse_pagination(request)
        queryset = self.filter_queryset(self.get_queryset())
        total = queryset.count()
        offset = (page - 1) * page_size
        rows = list(queryset[offset:offset + page_size])

        serializer = self.get_serializer(
            rows,
            many=True,
            context={"requested_category": request.query_params.get("category", "")},
        )
        return Response(
            {
                "success": True,
                "page": page,
                "page_size": page_size,
                "total": total,
                "items": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


get_news = NewsListView.as_view()
