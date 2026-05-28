import django_filters
from django.db.models import Q

from ...models import LiteratureItem
from .helpers import get_decoded_to_raw_categories


class LiteratureItemFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method="filter_search")
    category = django_filters.CharFilter(method="filter_category")

    class Meta:
        model = LiteratureItem
        fields = ("search", "category")

    def filter_search(self, queryset, _name, value):
        terms = [term.strip() for term in str(value or "").split() if term.strip()]
        if not terms:
            return queryset

        query = Q()
        for term in terms:
            query |= (
                Q(title__icontains=term)
                | Q(authors__icontains=term)
                | Q(description__icontains=term)
            )
        return queryset.filter(query)

    def filter_category(self, queryset, _name, value):
        categories = [category for category in self.request.query_params.getlist("category") if category]
        if not categories:
            categories = [value] if value else []
        if not categories or "all" in categories:
            return queryset

        decoded_to_raw_categories = get_decoded_to_raw_categories()
        raw_categories = [
            decoded_to_raw_categories.get(category, category)
            for category in categories
        ]
        return queryset.filter(category__in=raw_categories)
