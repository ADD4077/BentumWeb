from rest_framework import serializers

from ..models import Event, EventParticipation
from .service import EventBannerStorage


class EventListQuerySerializer(serializers.Serializer):
    page = serializers.IntegerField(required=False, min_value=1, default=1)
    page_size = serializers.IntegerField(required=False, min_value=1, max_value=24, default=6)


class EventMutationSerializer(serializers.Serializer):
    title = serializers.CharField(required=False, max_length=255)
    description = serializers.CharField(required=False, max_length=1024)
    location = serializers.CharField(required=False, allow_blank=True, max_length=255)
    starts_at = serializers.DateTimeField(required=False)
    max_participants = serializers.IntegerField(required=False, min_value=1, max_value=5000)

    def validate_location(self, value):
        return " ".join((value or "").splitlines()).strip()


class EventCreateSerializer(EventMutationSerializer):
    title = serializers.CharField(required=True, max_length=255)
    description = serializers.CharField(required=True, max_length=1024)
    location = serializers.CharField(required=False, allow_blank=True, max_length=255)
    starts_at = serializers.DateTimeField(required=True)
    max_participants = serializers.IntegerField(required=True, min_value=1, max_value=5000)


class EventParticipantSerializer(serializers.ModelSerializer):
    fullname = serializers.CharField(source="user.fullname", read_only=True)
    student_code = serializers.CharField(source="user.student_code", read_only=True)
    faculty = serializers.CharField(source="user.faculty", read_only=True)
    role = serializers.CharField(source="user.role", read_only=True)
    joined_at = serializers.DateTimeField(source="created_at", read_only=True)
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    attended_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = EventParticipation
        fields = ["id", "user_id", "fullname", "student_code", "faculty", "role", "joined_at", "attended", "attended_at"]


class EventAttendanceSaveSerializer(serializers.Serializer):
    attended_participant_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=True,
        default=list,
    )


class EventSerializer(serializers.ModelSerializer):
    participant_count = serializers.IntegerField(read_only=True)
    participant_ratio = serializers.SerializerMethodField()
    banner_url = serializers.SerializerMethodField()
    user_joined = serializers.SerializerMethodField()
    can_join = serializers.SerializerMethodField()
    status_label = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source="created_by.fullname", read_only=True)
    created_by_student_code = serializers.CharField(source="created_by.student_code", read_only=True)
    is_manageable = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()
    can_complete = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            "id",
            "title",
            "description",
            "location",
            "starts_at",
            "max_participants",
            "status",
            "status_label",
            "banner_url",
            "participant_count",
            "participant_ratio",
            "user_joined",
            "can_join",
            "created_by_name",
            "created_by_student_code",
            "is_manageable",
            "can_edit",
            "can_delete",
            "can_complete",
            "created_at",
            "updated_at",
        ]

    def get_participant_ratio(self, obj):
        participant_count = getattr(obj, "participant_count", None)
        if participant_count is None:
            participant_count = obj.participants.count()
        return f"{participant_count}/{obj.max_participants}"

    def get_banner_url(self, obj):
        return EventBannerStorage.get_url(obj.banner_path)

    def get_user_joined(self, obj):
        user = self.context.get("requesting_user")
        if not user:
            return False
        joined_map = self.context.get("joined_map")
        if isinstance(joined_map, dict):
            return bool(joined_map.get(obj.id))
        return obj.participants.filter(user=user).exists()

    def get_can_join(self, obj):
        user_joined = self.get_user_joined(obj)
        participant_count = getattr(obj, "participant_count", None)
        if participant_count is None:
            participant_count = obj.participants.count()
        has_slots = participant_count < obj.max_participants
        return user_joined or (obj.effective_status == Event.STATUS_ACTIVE and has_slots)

    def get_status_label(self, obj):
        return obj.get_effective_status_display()

    def get_is_manageable(self, obj):
        managed_event_ids = self.context.get("managed_event_ids")
        if managed_event_ids is not None:
            return obj.id in managed_event_ids
        return bool(self.context.get("can_manage"))

    def get_can_edit(self, obj):
        return self.get_is_manageable(obj) and obj.effective_status == Event.STATUS_ACTIVE

    def get_can_delete(self, obj):
        return self.get_is_manageable(obj) and obj.effective_status == Event.STATUS_ACTIVE

    def get_can_complete(self, obj):
        return self.get_is_manageable(obj) and obj.effective_status == Event.STATUS_IN_PROGRESS

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["status"] = instance.effective_status
        return data
