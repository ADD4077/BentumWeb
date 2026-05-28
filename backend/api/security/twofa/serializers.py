from rest_framework import serializers


class TwoFAConfigSerializer(serializers.Serializer):
    enabled = serializers.BooleanField(required=False, default=False)
    method = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class TwoFAVerifySerializer(serializers.Serializer):
    code = serializers.CharField(min_length=6, max_length=6)
