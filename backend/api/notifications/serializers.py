from rest_framework import serializers

from ..common.utils import serialize_datetime
from ..models import UserNotification


class NotificationSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source="notification_type")
    read_at = serializers.SerializerMethodField()
    created_at = serializers.SerializerMethodField()

    class Meta:
        model = UserNotification
        fields = (
            "id",
            "type",
            "title",
            "body",
            "metadata",
            "is_read",
            "read_at",
            "created_at",
        )

    def get_read_at(self, obj):
        return serialize_datetime(obj.read_at)

    def get_created_at(self, obj):
        return serialize_datetime(obj.created_at)


class NotificationListQuerySerializer(serializers.Serializer):
    page = serializers.IntegerField(required=False, min_value=1, default=1)
    page_size = serializers.IntegerField(required=False, min_value=1, max_value=50, default=20)
