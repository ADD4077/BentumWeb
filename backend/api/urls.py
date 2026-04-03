from django.urls import path
from django.contrib import admin as admin_django
from django.conf import settings
from django.conf.urls.static import static

from .views import save_data, dashboard, logout, theme, get_schedule, get_literature, get_news, get_public_stats, get_user_by_code, auth_check, get_user_sessions
from .telegram_binding_views import generate_telegram_link, get_telegram_binding_status, unlink_telegram_account, process_telegram_callback
from .twofa_views import get_2fa_config, set_2fa_config, verify_2fa, resend_2fa_code

from .profile_views import update_profile, update_avatar, update_banner, change_password

from .support_views import submit_support_request, test_telegram_connection, test_new_user_notification, send_new_user_notification

from .user_views import get_all_users, get_users_stats, create_user, ban_user, unban_user

from .admin_views import appoint_administrator, remove_administrator, get_administrators, get_administration_history

from .ban_views import get_ban_info

from . import media_views



urlpatterns = [

    path("api/save_data", save_data),

    path("api/dashboard", dashboard),

    path("api/logout", logout),

    path("api/auth/check", auth_check),

    path("api/theme", theme),

    path("api/schedule", get_schedule),

    path("api/literature", get_literature),

    path("api/public/stats", get_public_stats),

    path("api/news", get_news),

    path("api/profile/update", update_profile),

    path("api/profile/avatar", update_avatar),

    path("api/profile/banner", update_banner),

    path("api/change-password", change_password),

    path("api/user/by-code/<str:student_code>", get_user_by_code),

    path("api/ban/info", get_ban_info),

    # Telegram binding endpoints
    path("api/telegram/generate-link", generate_telegram_link),
    path("api/telegram/binding-status", get_telegram_binding_status),
    path("api/telegram/unlink", unlink_telegram_account),
    path("api/telegram/bind", process_telegram_callback),

    # 2FA endpoints
    path("api/2fa/config", get_2fa_config),
    path("api/2fa/config", set_2fa_config),
    path("api/2fa/verify", verify_2fa),
    path("api/2fa/resend", resend_2fa_code),

    # Sessions endpoints
    path("api/sessions", get_user_sessions),

    # Support endpoints

    path("api/support/submit", submit_support_request),

    path("api/support/test", test_telegram_connection),

    path("api/support/test-user-notification", test_new_user_notification),

    path("api/support/send-user-notification", send_new_user_notification),

    # Admin user management endpoints

    path("api/admin/users", get_all_users),

    path("api/admin/users/stats", get_users_stats),

    path("api/admin/users/create", create_user),

    path("api/admin/users/ban", ban_user),

    path("api/admin/users/unban", unban_user),

    # Admin management endpoints

    path("api/admin/administrators/appoint", appoint_administrator),

    path("api/admin/administrators/remove", remove_administrator),

    path("api/admin/administrators", get_administrators),

    path("api/admin/administrators/history", get_administration_history),

    # Media upload endpoints

    path("api/media/upload", media_views.upload_media),

    path("api/media/set-active", media_views.set_active_media),

    path("api/media/get", media_views.get_user_media),

    path("api/user/media", media_views.get_user_media_by_id),

    path("api/media/delete/<int:media_id>", media_views.delete_media),

    path("admin/", admin_django.site.urls),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
