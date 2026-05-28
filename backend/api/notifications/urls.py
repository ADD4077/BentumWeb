from django.urls import path

from . import views


urlpatterns = [
    path("", views.get_notifications, name="get_notifications"),
    path("recent", views.get_recent_notifications, name="get_recent_notifications"),
    path("read-all", views.mark_all_notifications_read, name="mark_all_notifications_read"),
]
