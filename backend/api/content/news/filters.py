import django_filters
from django.db.models import Q

from ...models import NewsItem
from .helpers import build_category_filter


class NewsItemFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method="filter_search")
    category = django_filters.CharFilter(method="filter_category")

    class Meta:
        model = NewsItem
        fields = ("search", "category")

    def filter_search(self, queryset, _name, value):
        terms = [term.strip() for term in str(value or "").split() if term.strip()]
        if not terms:
            return queryset

        search_query = Q()
        for term in terms:
            search_query |= (
                Q(title__icontains=term)
                | Q(summary__icontains=term)
                | Q(tags__icontains=term)
            )
        return queryset.filter(search_query)

    def filter_category(self, queryset, _name, value):
        category_filter = build_category_filter(value)
        if not category_filter:
            return queryset
        return queryset.filter(category_filter)
