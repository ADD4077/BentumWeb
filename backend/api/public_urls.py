from django.urls import path

from . import user_views


urlpatterns = [
    path("api/user/by-code/<str:student_code>", user_views.get_user_by_code, name="user_by_code"),
    path("api/public/stats", user_views.get_public_stats, name="public_stats"),
]
