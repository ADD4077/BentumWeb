import logging

from django.db import transaction
from django.db.models import Case, Count, IntegerField, Value, When
from django.utils import timezone
from rest_framework import status
from rest_framework.generics import GenericAPIView
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from ..common.drf import SessionUserAPIView
from ..models import Event, EventParticipation, User
from .serializers import (
    EventAttendanceSaveSerializer,
    EventCreateSerializer,
    EventListQuerySerializer,
    EventMutationSerializer,
    EventParticipantSerializer,
    EventSerializer,
)
from .service import EventBannerStorage

logger = logging.getLogger(__name__)


def can_manage_events(user: User | None) -> bool:
    return bool(user and (user.role == User.ROLE_CHAIRPERSON or getattr(user, "is_admin", False)))


class EventListView(SessionUserAPIView, GenericAPIView):
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    serializer_class = EventSerializer

    def get_queryset(self):
        now = timezone.now()
        status_rank = Case(
            When(status=Event.STATUS_COMPLETED, then=Value(2)),
            When(starts_at__lte=now, then=Value(0)),
            When(starts_at__gt=now, then=Value(1)),
            default=Value(3),
            output_field=IntegerField(),
        )
        return (
            Event.objects.exclude(status=Event.STATUS_COMPLETED)
            .select_related("created_by")
            .annotate(participant_count=Count("participants", distinct=True), status_rank=status_rank)
            .order_by("status_rank", "starts_at", "-created_at")
        )

    def get(self, request):
        query_serializer = EventListQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=False)
        query_data = query_serializer.validated_data or {"page": 1, "page_size": 6}
        page = query_data["page"]
        page_size = query_data["page_size"]

        user, _ = self.get_session_user(request)
        queryset = self.get_queryset()
        total = queryset.count()
        offset = (page - 1) * page_size
        rows = list(queryset[offset:offset + page_size])

        joined_map = {}
        if user:
            joined_ids = set(
                EventParticipation.objects.filter(user=user, event_id__in=[row.id for row in rows]).values_list("event_id", flat=True)
            )
            joined_map = {event_id: True for event_id in joined_ids}

        serializer = self.get_serializer(
            rows,
            many=True,
            context={
                "requesting_user": user,
                "joined_map": joined_map,
                "can_manage": can_manage_events(user),
            },
        )
        return self.success_response(
            items=serializer.data,
            total=total,
            page=page,
            page_size=page_size,
            has_more=offset + len(rows) < total,
            can_manage=can_manage_events(user),
        )

    def post(self, request):
        user, error_response = self.get_session_user(request)
        if error_response:
            return error_response
        if not can_manage_events(user):
            return self.error_response("Недостаточно прав", http_status=status.HTTP_403_FORBIDDEN)

        serializer = EventCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        banner_file = request.FILES.get("banner")
        if not banner_file:
            return self.error_response("Баннер обязателен", http_status=status.HTTP_400_BAD_REQUEST)

        try:
            banner_payload = EventBannerStorage.save(banner_file.read(), banner_file.name)
        except ValueError as error:
            return self.error_response(str(error), http_status=status.HTTP_400_BAD_REQUEST)

        event = Event.objects.create(
            created_by=user,
            title=serializer.validated_data["title"],
            description=serializer.validated_data["description"],
            starts_at=serializer.validated_data["starts_at"],
            max_participants=serializer.validated_data["max_participants"],
            status=Event.STATUS_ACTIVE,
            banner_path=banner_payload["path"],
            banner_original_filename=banner_payload["original_filename"],
            banner_file_size=banner_payload["file_size"],
            banner_width=banner_payload["width"],
            banner_height=banner_payload["height"],
        )

        event = (
            Event.objects.select_related("created_by")
            .annotate(participant_count=Count("participants", distinct=True))
            .get(id=event.id)
        )
        payload = self.get_serializer(
            event,
            context={"requesting_user": user, "joined_map": {}, "can_manage": True},
        ).data
        return self.success_response(item=payload, http_status=status.HTTP_201_CREATED)


class EventDetailView(SessionUserAPIView, GenericAPIView):
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    serializer_class = EventSerializer

    def get_event(self, event_id):
        return (
            Event.objects.select_related("created_by")
            .annotate(participant_count=Count("participants", distinct=True))
            .filter(id=event_id)
            .first()
        )

    def patch(self, request, event_id):
        user, error_response = self.get_session_user(request)
        if error_response:
            return error_response
        if not can_manage_events(user):
            return self.error_response("Недостаточно прав", http_status=status.HTTP_403_FORBIDDEN)

        event = self.get_event(event_id)
        if not event:
            return self.error_response("Мероприятие не найдено", http_status=status.HTTP_404_NOT_FOUND)
        if event.effective_status != Event.STATUS_ACTIVE:
            return self.error_response("Редактировать можно только активное мероприятие", http_status=status.HTTP_400_BAD_REQUEST)

        serializer = EventMutationSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        changes = serializer.validated_data

        for field in ["title", "description", "starts_at", "max_participants"]:
            if field in changes:
                setattr(event, field, changes[field])

        banner_file = request.FILES.get("banner")
        if banner_file:
            old_path = event.banner_path
            try:
                banner_payload = EventBannerStorage.save(banner_file.read(), banner_file.name)
            except ValueError as error:
                return self.error_response(str(error), http_status=status.HTTP_400_BAD_REQUEST)
            event.banner_path = banner_payload["path"]
            event.banner_original_filename = banner_payload["original_filename"]
            event.banner_file_size = banner_payload["file_size"]
            event.banner_width = banner_payload["width"]
            event.banner_height = banner_payload["height"]
            if old_path and old_path != event.banner_path:
                EventBannerStorage.delete(old_path)

        event.save()
        event.refresh_from_db()
        event = self.get_event(event.id)
        payload = self.get_serializer(
            event,
            context={"requesting_user": user, "joined_map": {}, "can_manage": True},
        ).data
        return self.success_response(item=payload)

    def delete(self, request, event_id):
        user, error_response = self.get_session_user(request)
        if error_response:
            return error_response
        if not can_manage_events(user):
            return self.error_response("Недостаточно прав", http_status=status.HTTP_403_FORBIDDEN)

        event = Event.objects.filter(id=event_id).first()
        if not event:
            return self.error_response("Мероприятие не найдено", http_status=status.HTTP_404_NOT_FOUND)
        if event.effective_status != Event.STATUS_ACTIVE:
            return self.error_response("Удалить можно только активное мероприятие", http_status=status.HTTP_400_BAD_REQUEST)

        banner_path = event.banner_path
        event.delete()
        EventBannerStorage.delete(banner_path)
        return self.success_response(message="Мероприятие удалено")


class EventParticipantsView(SessionUserAPIView, GenericAPIView):
    serializer_class = EventParticipantSerializer

    def get(self, request, event_id):
        user, error_response = self.get_session_user(request)
        if error_response:
            return error_response
        if not can_manage_events(user):
            return self.error_response("Недостаточно прав", http_status=status.HTTP_403_FORBIDDEN)

        event = Event.objects.filter(id=event_id).first()
        if not event:
            return self.error_response("Мероприятие не найдено", http_status=status.HTTP_404_NOT_FOUND)

        rows = list(EventParticipation.objects.filter(event=event).select_related("user").order_by("-created_at"))
        serializer = self.get_serializer(rows, many=True)
        return self.success_response(participants=serializer.data)


class EventCompleteView(SessionUserAPIView):
    def post(self, request, event_id):
        user, error_response = self.get_session_user(request)
        if error_response:
            return error_response
        if not can_manage_events(user):
            return self.error_response("Недостаточно прав", http_status=status.HTTP_403_FORBIDDEN)

        event = Event.objects.filter(id=event_id).first()
        if not event:
            return self.error_response("Мероприятие не найдено", http_status=status.HTTP_404_NOT_FOUND)
        if event.effective_status != Event.STATUS_IN_PROGRESS:
            return self.error_response("Завершить можно только мероприятие в процессе", http_status=status.HTTP_400_BAD_REQUEST)

        event.status = Event.STATUS_COMPLETED
        event.save(update_fields=["status", "updated_at"])
        return self.success_response(message="Мероприятие завершено")


class EventParticipantDeleteView(SessionUserAPIView):
    def delete(self, request, event_id, participation_id):
        user, error_response = self.get_session_user(request)
        if error_response:
            return error_response
        if not can_manage_events(user):
            return self.error_response("Недостаточно прав", http_status=status.HTTP_403_FORBIDDEN)

        event = Event.objects.filter(id=event_id).first()
        if not event:
            return self.error_response("Мероприятие не найдено", http_status=status.HTTP_404_NOT_FOUND)
        if event.status == Event.STATUS_COMPLETED:
            return self.error_response("Нельзя менять список участников завершённого мероприятия", http_status=status.HTTP_400_BAD_REQUEST)

        participation = EventParticipation.objects.filter(id=participation_id, event_id=event_id).first()
        if not participation:
            return self.error_response("Участник не найден", http_status=status.HTTP_404_NOT_FOUND)

        participation.delete()
        participant_count = EventParticipation.objects.filter(event_id=event_id).count()
        return self.success_response(
            message="Участник удалён",
            participant_count=participant_count,
            participant_ratio=f"{participant_count}/{event.max_participants}",
        )


class EventAttendanceSaveView(SessionUserAPIView, GenericAPIView):
    serializer_class = EventAttendanceSaveSerializer

    def post(self, request, event_id):
        user, error_response = self.get_session_user(request)
        if error_response:
            return error_response
        if not can_manage_events(user):
            return self.error_response("Недостаточно прав", http_status=status.HTTP_403_FORBIDDEN)

        event = Event.objects.filter(id=event_id).first()
        if not event:
            return self.error_response("Мероприятие не найдено", http_status=status.HTTP_404_NOT_FOUND)
        if event.effective_status != Event.STATUS_IN_PROGRESS:
            return self.error_response(
                "Отмечать присутствие можно только для мероприятия в процессе",
                http_status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        attended_ids = set(serializer.validated_data["attended_participant_ids"])

        rows = list(EventParticipation.objects.filter(event=event))
        row_map = {row.id: row for row in rows}
        invalid_ids = attended_ids.difference(row_map.keys())
        if invalid_ids:
            return self.error_response("Некоторые участники не найдены", http_status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        changed_rows = []
        for row in rows:
            should_attend = row.id in attended_ids
            next_attended_at = now if should_attend else None
            if row.attended != should_attend or row.attended_at != next_attended_at:
                row.attended = should_attend
                row.attended_at = next_attended_at
                changed_rows.append(row)

        if changed_rows:
            EventParticipation.objects.bulk_update(changed_rows, ["attended", "attended_at"])

        refreshed_rows = list(EventParticipation.objects.filter(event=event).select_related("user").order_by("-created_at"))
        payload = EventParticipantSerializer(refreshed_rows, many=True).data
        return self.success_response(
            message="Отметки участников сохранены",
            participants=payload,
            attended_participant_ids=[row["id"] for row in payload if row.get("attended")],
        )


class EventParticipationToggleView(SessionUserAPIView):
    def post(self, request, event_id):
        user, error_response = self.get_session_user(request)
        if error_response:
            return error_response

        event = Event.objects.annotate(participant_count=Count("participants", distinct=True)).filter(id=event_id).first()
        if not event:
            return self.error_response("Мероприятие не найдено", http_status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            existing = EventParticipation.objects.select_for_update().filter(event=event, user=user).first()
            if existing:
                existing.delete()
                event = Event.objects.annotate(participant_count=Count("participants", distinct=True)).get(id=event_id)
                return self.success_response(
                    joined=False,
                    participant_count=event.participant_count,
                    participant_ratio=f"{event.participant_count}/{event.max_participants}",
                    message="Вы больше не участвуете",
                )

            if event.effective_status != Event.STATUS_ACTIVE:
                return self.error_response("Регистрация на это мероприятие уже закрыта", http_status=status.HTTP_400_BAD_REQUEST)

            if event.participant_count >= event.max_participants:
                return self.error_response("Свободных мест больше нет", http_status=status.HTTP_400_BAD_REQUEST)

            EventParticipation.objects.create(event=event, user=user)
            event = Event.objects.annotate(participant_count=Count("participants", distinct=True)).get(id=event_id)
            return self.success_response(
                joined=True,
                participant_count=event.participant_count,
                participant_ratio=f"{event.participant_count}/{event.max_participants}",
                message="Участие подтверждено",
            )
