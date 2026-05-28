from django.db.models import Q


_CATEGORY_FILTERS = {
    "academic": Q(tags__icontains="Преподаватели БНТУ") | Q(tags__icontains="БНТУ"),
    "achievements": Q(tags__icontains="Спорт") | Q(tags__icontains="Культура"),
    "education": Q(tags__icontains="Студенты"),
    "events": Q(tags__icontains="Мероприятие") | Q(tags__icontains="Преподаватели БНТУ"),
    "sports": Q(tags__icontains="Спорт"),
}


def build_category_filter(category: str) -> Q:
    normalized = (category or "").strip().lower()
    if not normalized or normalized == "all":
        return Q()
    return _CATEGORY_FILTERS.get(normalized, Q())


def detect_category(item, requested_category: str) -> str:
    normalized_requested = (requested_category or "").strip().lower()
    if normalized_requested and normalized_requested != "all":
        return normalized_requested

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
