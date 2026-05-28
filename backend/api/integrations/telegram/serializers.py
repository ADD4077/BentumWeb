from rest_framework import serializers


class TelegramCallbackSerializer(serializers.Serializer):
    token = serializers.CharField(required=True, allow_blank=False)
    telegram = serializers.DictField(required=True)


class TelegramBindingStatusSerializer(serializers.Serializer):
    is_linked = serializers.BooleanField()
    telegram_username = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    telegram_first_name = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    telegram_last_name = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    linked_at = serializers.CharField(required=False, allow_null=True, allow_blank=True)
