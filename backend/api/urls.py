"""
Конфигурация URL API - Модульная структура
"""
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

# Общие представления (еще не модулированы)
from .common_views import health_check
from .user_views import (
    get_all_users, get_users_stats, create_user, ban_user, unban_user,
    get_user_by_code, get_public_stats, email_binding_status, email_bind
)

urlpatterns = [
    # Проверка работоспособности (общее)
    path("api/health", health_check),
    
    # Модуль ядра (авторизация, дашборд, сессии, настройка 2FA)
    path("api/", include("api.core.urls")),
    path("api/save_data", include("api.core.urls")),  # Сохранить старый путь
    
    # Модуль контента (литература, новости, расписание)
    path("api/literature", include("api.content.literature.urls")),
    path("api/news", include("api.content.news.urls")),
    path("api/schedule", include("api.content.schedule.urls")),
    
    # Модуль профиля
    path("api/profile/", include("api.profile.urls")),
    path("api/change-password", include("api.profile.urls")),
    
    # Модуль безопасности (2FA, баны)
    path("api/2fa/", include("api.security.twofa.urls")),
    path("api/ban/", include("api.security.ban.urls")),
    
    # Модуль медиа
    path("api/media/", include("api.media.urls")),
    path("api/user/media", include("api.media.urls")),
    
    # Интеграция Telegram
    path("api/telegram/", include("api.integrations.telegram.urls")),
    
    # Модуль поддержки
    path("api/support/", include("api.support.urls")),
    
    # Endpoints пользователя (должны быть ДО include admin/)
    path("api/user/by-code/<str:student_code>", get_user_by_code),
    path("api/public/stats", get_public_stats),
    path("api/email/binding-status", email_binding_status),
    path("api/email/bind", email_bind),
    path("api/admin/users", get_all_users),
    path("api/admin/users/stats", get_users_stats),
    path("api/admin/users/create", create_user),
    path("api/admin/users/ban", ban_user),
    path("api/admin/users/unban", unban_user),
    
    # Модуль администратора (должен быть ПОСЛЕ конкретных путей admin/users)
    path("api/admin/", include("api.admin.urls")),
    
    # Django админка
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
