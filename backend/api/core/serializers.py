from rest_framework import serializers


class SaveDataSerializer(serializers.Serializer):
    studentCode = serializers.CharField(max_length=10)
    password = serializers.CharField(min_length=7, trim_whitespace=False)
    referralCode = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class ThemeSerializer(serializers.Serializer):
    theme = serializers.ChoiceField(choices=("dark", "light"))


class DashboardQuerySerializer(serializers.Serializer):
    student_code = serializers.CharField(required=False, max_length=10)
