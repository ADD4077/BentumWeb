"""
API URL configuration.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path

from .common_views import health_check
from .content.schedule import views as schedule_views
from .profile import views as profile_views

urlpatterns = [
    path("api/health", health_check),
    path("api/literature", include("api.content.literature.urls")),
    path("api/news", include("api.content.news.urls")),
    path("api/schedule/next", schedule_views.get_next_schedule_lesson, name="get_next_schedule_lesson_direct"),
    path("api/schedule/next/", schedule_views.get_next_schedule_lesson, name="get_next_schedule_lesson_direct_slash"),
    path("api/schedule", include("api.content.schedule.urls")),
    path("api/schedule/", include("api.content.schedule.urls")),
    path("api/profile/", include("api.profile.urls")),
    path("api/change-password/password", profile_views.change_password, name="change_password_legacy"),
    path("api/2fa/", include("api.security.twofa.urls")),
    path("api/ban/", include("api.security.ban.urls")),
    path("api/media/", include("api.media.urls")),
    path("api/user/media", include("api.media.urls")),
    path("api/notifications/", include("api.notifications.urls")),
    path("api/telegram/", include("api.integrations.telegram.urls")),
    path("api/support/", include("api.support.urls")),
    path("api/events/", include("api.events.urls")),
    path("", include("api.public_urls")),
    path("", include("api.admin_users_urls")),
    path("api/admin/", include("api.admin.urls")),
    path("api/", include("api.core.urls")),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
