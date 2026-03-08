from django.urls import path
from .views import save_data, dashboard, logout, theme, get_schedule, get_literature, get_news
from .profile_views import update_profile, update_avatar, update_banner
from . import media_views

urlpatterns = [
    path("api/save_data", save_data),
    path("api/dashboard", dashboard),
    path("api/logout", logout),
    path("api/theme", theme),
    path("api/schedule", get_schedule),
    path("api/literature", get_literature),
    path("api/news", get_news),
    path("api/profile/update", update_profile),
    path("api/profile/avatar", update_avatar),
    path("api/profile/banner", update_banner),
    # Media upload endpoints
    path("api/media/upload", media_views.upload_media),
    path("api/media/set-active", media_views.set_active_media),
    path("api/media/get", media_views.get_user_media),
    path("api/media/delete/<int:media_id>", media_views.delete_media),
]
