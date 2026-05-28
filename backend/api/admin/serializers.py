from rest_framework import serializers


class AppointAdministratorSerializer(serializers.Serializer):
    student_code = serializers.CharField(max_length=10)
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class RemoveAdministratorSerializer(serializers.Serializer):
    student_code = serializers.CharField(max_length=10)


class AdministratorListQuerySerializer(serializers.Serializer):
    page = serializers.IntegerField(required=False, min_value=1, default=1)
    per_page = serializers.IntegerField(required=False, min_value=1, max_value=100, default=20)


class AdministrationHistoryQuerySerializer(serializers.Serializer):
    student_code = serializers.CharField(required=False, allow_blank=True, max_length=10)
