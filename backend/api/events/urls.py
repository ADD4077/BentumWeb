from django.urls import path

from .views import (
    EventAttendanceSaveView,
    EventCompleteView,
    EventDetailView,
    EventListView,
    EventParticipantDeleteView,
    EventParticipantsView,
    EventParticipationToggleView,
)

urlpatterns = [
    path("", EventListView.as_view(), name="events"),
    path("<int:event_id>", EventDetailView.as_view(), name="event-detail"),
    path("<int:event_id>/complete", EventCompleteView.as_view(), name="event-complete"),
    path("<int:event_id>/participants", EventParticipantsView.as_view(), name="event-participants"),
    path("<int:event_id>/attendance", EventAttendanceSaveView.as_view(), name="event-attendance-save"),
    path("<int:event_id>/participants/<int:participation_id>", EventParticipantDeleteView.as_view(), name="event-participant-delete"),
    path("<int:event_id>/participation", EventParticipationToggleView.as_view(), name="event-participation"),
]
