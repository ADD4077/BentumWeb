from django.urls import path

from . import user_views


urlpatterns = [
    path("api/admin/users", user_views.get_all_users, name="admin_users_list"),
    path("api/admin/users/<int:user_id>/profile", user_views.get_admin_user_profile, name="admin_user_profile"),
    path("api/admin/users/stats", user_views.get_users_stats, name="admin_users_stats"),
    path("api/admin/activity", user_views.get_admin_activity, name="admin_activity"),
    path("api/admin/users/create", user_views.create_user, name="admin_users_create"),
    path("api/admin/users/ban", user_views.ban_user, name="admin_users_ban"),
    path("api/admin/users/unban", user_views.unban_user, name="admin_users_unban"),
]
