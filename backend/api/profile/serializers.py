from rest_framework import serializers


class ProfilePreferencesSerializer(serializers.Serializer):
    notify_successful_login = serializers.BooleanField(required=False)
    notifySupportReplies = serializers.BooleanField(required=False)
    notify_support_replies = serializers.BooleanField(required=False)
    notifySecurityEvents = serializers.BooleanField(required=False)
    notify_security_events = serializers.BooleanField(required=False)
    showProfileInCommunity = serializers.BooleanField(required=False)
    show_profile_in_community = serializers.BooleanField(required=False)
    allowTelegramDiscovery = serializers.BooleanField(required=False)
    allow_telegram_discovery = serializers.BooleanField(required=False)


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=True, allow_blank=False)
    new_password = serializers.CharField(required=True, allow_blank=False)
    confirm_password = serializers.CharField(required=True, allow_blank=False)
