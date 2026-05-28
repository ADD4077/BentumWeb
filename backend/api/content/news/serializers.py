from rest_framework import serializers

from ...common.utils import parse_tags
from ...models import NewsItem
from .helpers import detect_category


class NewsItemSerializer(serializers.ModelSerializer):
    excerpt = serializers.SerializerMethodField()
    content = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()
    tags = serializers.SerializerMethodField()
    author = serializers.SerializerMethodField()
    imageUrl = serializers.CharField(source="image_url")
    featured = serializers.SerializerMethodField()
    readTime = serializers.SerializerMethodField()

    class Meta:
        model = NewsItem
        fields = (
            "id",
            "title",
            "excerpt",
            "content",
            "category",
            "tags",
            "author",
            "date",
            "timestamp",
            "imageUrl",
            "link",
            "featured",
            "readTime",
        )

    def get_excerpt(self, obj):
        return obj.summary or ""

    def get_content(self, obj):
        return obj.summary or ""

    def get_category(self, obj):
        return detect_category(obj, self.context.get("requested_category", ""))

    def get_tags(self, obj):
        return parse_tags(obj.tags)

    def get_author(self, _obj):
        return "БНТУ"

    def get_featured(self, _obj):
        return False

    def get_readTime(self, obj):
        return f"{obj.reading_time or 5} мин"
