from rest_framework import serializers

from ...common.utils import format_size
from ...models import LiteratureItem
from .helpers import repair_mojibake


class LiteratureItemSerializer(serializers.ModelSerializer):
    author = serializers.CharField(source="authors")
    category = serializers.SerializerMethodField()
    year = serializers.CharField(source="publishing_date")
    downloadUrl = serializers.CharField(source="download_link")
    downloadSize = serializers.SerializerMethodField()

    class Meta:
        model = LiteratureItem
        fields = (
            "id",
            "title",
            "author",
            "description",
            "category",
            "year",
            "faculty",
            "downloadUrl",
            "downloadSize",
            "image_url",
        )

    def get_category(self, obj):
        return repair_mojibake(obj.category)

    def get_downloadSize(self, obj):
        return format_size(obj.download_size)
