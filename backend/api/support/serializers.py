from rest_framework import serializers


class SupportRequestSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=512, trim_whitespace=True)
    type = serializers.CharField(required=False, allow_blank=True, default="support")


class SupportThreadsQuerySerializer(serializers.Serializer):
    page = serializers.IntegerField(required=False, min_value=1, default=1)
    page_size = serializers.IntegerField(required=False, min_value=1, max_value=10, default=10)
    status = serializers.CharField(required=False, allow_blank=True, default="open")
    search = serializers.CharField(required=False, allow_blank=True, default="")


class ModerThreadsQuerySerializer(serializers.Serializer):
    page = serializers.IntegerField(required=False, min_value=1, default=1)
    page_size = serializers.IntegerField(required=False, min_value=1, max_value=10, default=10)
    status = serializers.CharField(required=False, allow_blank=True, default="all")
    type = serializers.CharField(required=False, allow_blank=True, default="all")
    search = serializers.CharField(required=False, allow_blank=True, default="")


class SupportReplySerializer(serializers.Serializer):
    message = serializers.CharField(max_length=2000, trim_whitespace=True)


class SupportStatusSerializer(serializers.Serializer):
    status = serializers.CharField()


class DebugNewUserNotificationSerializer(serializers.Serializer):
    fullname = serializers.CharField()
    student_code = serializers.CharField()
