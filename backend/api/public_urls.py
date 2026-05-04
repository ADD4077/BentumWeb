from django.urls import path

from . import dev_team_views, user_views


urlpatterns = [
    path("api/user/by-code/<str:student_code>", user_views.get_user_by_code, name="user_by_code"),
    path("api/public/stats", user_views.get_public_stats, name="public_stats"),
    path("api/public/dev-team", dev_team_views.get_dev_team_members, name="public_dev_team"),
]
