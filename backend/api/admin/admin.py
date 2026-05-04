from django.contrib import admin
from api.models import (
    ActivityEvent,
    BackgroundJob,
    DevTeamMember,
    LiteratureItem,
    NewsItem,
    ScheduleEntry,
    SupportMessage,
    SupportThread,
    User,
    UserSettings,
    UserSession,
    UserProfileMedia,
    MediaOptimization,
    Administration,
    UserBan,
    TelegramBinding,
)


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "fullname",
        "student_code",
        "faculty",
        "role",
        "is_staff",
        "is_superuser",
        "created_at",
        "last_login",
        "twofa_enabled",
    ]
    list_filter = ["faculty", "role", "is_staff", "is_superuser", "is_active", "created_at", "twofa_enabled", "twofa_method"]
    search_fields = ["fullname", "student_code", "id"]
    ordering = ['-created_at']
    
    # Все поля доступны для редактирования
    fields = [
        'fullname', 'student_code', 'faculty', 'password',
        'role', 'created_at', 'last_login',
        'twofa_enabled', 'twofa_method',
        'is_active', 'is_staff', 'is_superuser', 'auth_sync_managed',
        'groups', 'user_permissions',
    ]
    
    readonly_fields = ['related_objects_info']
    
    def related_objects_info(self, obj):
        """Показывает связанные объекты для информации перед удалением"""
        if not obj or not obj.pk:
            return "-"
        
        info = []
        
        # Telegram привязка
        if hasattr(obj, 'telegram_binding') and obj.telegram_binding:
            info.append(f"Telegram: {obj.telegram_binding.telegram_username or obj.telegram_binding.telegram_id}")
        
        # Медиа файлы
        media_count = obj.media_files.count()
        if media_count > 0:
            info.append(f"Медиа файлы: {media_count}")
        
        # Сессии
        from api.models import UserSession
        session_count = UserSession.objects.filter(student_code=obj.student_code).count()
        if session_count > 0:
            info.append(f"Сессии: {session_count}")
        
        # Баны
        from api.models import UserBan
        ban_count = UserBan.objects.filter(user=obj, is_active=True).count()
        if ban_count > 0:
            info.append(f"Активные баны: {ban_count}")
        
        # Админ права
        from api.models import Administration
        admin_count = Administration.objects.filter(administrator=obj, is_active=True).count()
        if admin_count > 0:
            info.append(f"Админ права: {admin_count}")

        # Обращения в поддержку
        from api.models import SupportThread
        support_count = SupportThread.objects.filter(created_by=obj).count()
        if support_count > 0:
            info.append(f"Обращения: {support_count}")

        # Активность пользователя
        from api.models import ActivityEvent
        event_count = ActivityEvent.objects.filter(user=obj).count()
        if event_count > 0:
            info.append(f"События: {event_count}")
        
        return "; ".join(info) if info else "Нет связанных объектов"
    
    related_objects_info.short_description = "Связанные объекты"
    
    def delete_model(self, request, obj):
        # Каскадно удаляем связанные записи перед удалением пользователя
        try:
            # Удаляем Telegram привязку если есть
            if hasattr(obj, 'telegram_binding'):
                obj.telegram_binding.delete()
            
            # Удаляем медиа файлы
            obj.media_files.all().delete()
            
            # Удаляем сессии
            from api.models import UserSession
            UserSession.objects.filter(student_code=obj.student_code).delete()
            
            # Удаляем бан записи
            from api.models import UserBan
            UserBan.objects.filter(user=obj).delete()
            
            # Удаляем администраторские записи
            from api.models import Administration
            Administration.objects.filter(administrator=obj).delete()

            # Удаляем обращения и сообщения поддержки
            from api.models import SupportThread, SupportMessage, ActivityEvent, UserSettings
            SupportMessage.objects.filter(author=obj).delete()
            SupportThread.objects.filter(created_by=obj).delete()
            SupportThread.objects.filter(assigned_moderator=obj).update(assigned_moderator=None)
            ActivityEvent.objects.filter(user=obj).delete()
            ActivityEvent.objects.filter(actor=obj).update(actor=None)
            UserSettings.objects.filter(user=obj).delete()
            
            # Теперь удаляем пользователя
            super().delete_model(request, obj)
        except Exception as e:
            raise Exception(f"Ошибка при удалении пользователя: {str(e)}")


@admin.register(UserProfileMedia)
class UserProfileMediaAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'media_type', 'original_filename', 'is_active', 'created_at']
    list_filter = ['media_type', 'is_active', 'created_at']
    search_fields = ['user__fullname', 'user__student_code', 'file_path', 'original_filename']
    raw_id_fields = ['user']
    fields = ['user', 'media_type', 'original_filename', 'file_path', 'file_size', 'mime_type', 'width', 'height', 'is_active', 'created_at']


@admin.register(MediaOptimization)
class MediaOptimizationAdmin(admin.ModelAdmin):
    list_display = ['id', 'original_media', 'size_type', 'file_size', 'created_at']
    list_filter = ['size_type', 'created_at']
    search_fields = ['original_media__user__student_code']
    raw_id_fields = ['original_media']
    readonly_fields = ['created_at']
    fields = ['original_media', 'size_type', 'file_path', 'file_size', 'created_at']


@admin.register(Administration)
class AdministrationAdmin(admin.ModelAdmin):
    list_display = ['id', 'administrator', 'appointed_by', 'is_active', 'appointed_at', 'notes']
    list_filter = ['is_active', 'appointed_at']
    search_fields = ['administrator__fullname', 'administrator__student_code', 'notes']
    raw_id_fields = ['administrator', 'appointed_by']
    readonly_fields = ['appointed_at']
    fields = ['administrator', 'appointed_by', 'is_active', 'appointed_at', 'notes']


@admin.register(UserBan)
class UserBanAdmin(admin.ModelAdmin):
    list_display = ['id', 'student_code', 'user', 'is_active', 'created_at', 'ban_date', 'banned_by']
    list_filter = ['is_active', 'created_at', 'ban_date']
    search_fields = ['student_code', 'ban_reason', 'user__fullname', 'user__student_code', 'banned_by__fullname', 'banned_by__student_code']
    readonly_fields = ['created_at', 'ban_date']
    raw_id_fields = ['user', 'banned_by']
    fields = ['student_code', 'user', 'banned_by', 'ban_reason', 'is_active', 'created_at', 'ban_date', 'ban_duration_seconds']


@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display = [
        "student_code", 
        "browser", 
        "os", 
        "ip_address", 
        "created_at", 
        "last_activity"
    ]
    list_filter = ["browser", "os", "created_at", "last_activity"]
    search_fields = ["student_code", "browser", "os", "ip_address"]
    readonly_fields = ["session_key", "user_agent", "created_at", "last_activity"]
    
    fieldsets = (
        ("Информация о пользователе", {
            "fields": ("student_code", "session_key")
        }),
        ("Информация об устройстве", {
            "fields": (
                "browser", 
                "os", 
                "ip_address"
            )
        }),
        ("User-Agent", {
            "fields": ("user_agent",),
            "classes": ("collapse",)
        }),
        ("Время", {
            "fields": ("created_at", "last_activity")
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).order_by('-created_at')


@admin.register(TelegramBinding)
class TelegramBindingAdmin(admin.ModelAdmin):
    list_display = [
        "user", 
        "telegram_id", 
        "telegram_username", 
        "telegram_first_name", 
        "is_active", 
        "created_at"
    ]
    list_filter = ["is_active", "created_at"]
    search_fields = [
        "user__fullname", 
        "user__student_code", 
        "telegram_username", 
        "telegram_first_name"
    ]
    readonly_fields = ["created_at", "updated_at"]
    
    fieldsets = (
        ("Информация о пользователе", {
            "fields": ("user",)
        }),
        ("Данные Telegram", {
            "fields": (
                "telegram_id", 
                "telegram_username", 
                "telegram_first_name", 
                "telegram_last_name"
            )
        }),
        ("Статус", {
            "fields": ("is_active", "binding_token")
        }),
        ("Системная информация", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')
    
    def user(self, obj):
        return f"{obj.user.fullname} ({obj.user.student_code})"
    user.short_description = "Пользователь"


@admin.register(UserSettings)
class UserSettingsAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "user",
        "notify_successful_login",
        "notify_support_replies",
        "notify_security_events",
        "show_profile_in_community",
        "show_faculty",
        "allow_telegram_discovery",
        "created_at",
        "updated_at",
    ]
    list_filter = [
        "notify_successful_login",
        "notify_support_replies",
        "notify_security_events",
        "show_profile_in_community",
        "show_faculty",
        "allow_telegram_discovery",
        "created_at",
        "updated_at",
    ]
    search_fields = ["user__fullname", "user__student_code"]
    raw_id_fields = ["user"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(ActivityEvent)
class ActivityEventAdmin(admin.ModelAdmin):
    list_display = ["id", "event_type", "user", "actor", "created_at"]
    list_filter = ["event_type", "created_at"]
    search_fields = ["details", "user__fullname", "user__student_code", "actor__fullname", "actor__student_code"]
    raw_id_fields = ["user", "actor"]
    readonly_fields = ["created_at"]
    fields = ["event_type", "user", "actor", "details", "metadata", "created_at"]


@admin.register(DevTeamMember)
class DevTeamMemberAdmin(admin.ModelAdmin):
    list_display = ["id", "fullname", "student_code", "role", "display_order", "is_active", "updated_at"]
    list_filter = ["is_active", "updated_at", "created_at"]
    search_fields = ["fullname", "student_code", "role", "description"]
    ordering = ["display_order", "id"]
    readonly_fields = ["created_at", "updated_at"]
    fields = [
        "fullname",
        "student_code",
        "role",
        "description",
        "display_order",
        "is_active",
        "created_at",
        "updated_at",
    ]


@admin.register(SupportThread)
class SupportThreadAdmin(admin.ModelAdmin):
    list_display = ["id", "subject", "request_type", "status", "created_by", "assigned_moderator", "last_message_at"]
    list_filter = ["request_type", "status", "created_at", "last_message_at"]
    search_fields = ["subject", "created_by__fullname", "created_by__student_code"]
    raw_id_fields = ["created_by", "assigned_moderator"]
    readonly_fields = ["created_at", "updated_at", "last_message_at"]
    fields = [
        "subject",
        "request_type",
        "status",
        "created_by",
        "assigned_moderator",
        "created_at",
        "updated_at",
        "last_message_at",
    ]


@admin.register(SupportMessage)
class SupportMessageAdmin(admin.ModelAdmin):
    list_display = ["id", "thread", "author", "is_moderator_reply", "created_at"]
    list_filter = ["is_moderator_reply", "created_at"]
    search_fields = ["body", "author__fullname", "author__student_code", "thread__subject"]
    raw_id_fields = ["thread", "author"]
    readonly_fields = ["created_at"]
    fields = ["thread", "author", "body", "is_moderator_reply", "created_at"]


@admin.register(BackgroundJob)
class BackgroundJobAdmin(admin.ModelAdmin):
    list_display = ["id", "job_type", "status", "attempts", "max_attempts", "available_at", "created_at"]
    list_filter = ["job_type", "status", "available_at", "created_at"]
    search_fields = ["job_type", "job_key", "last_error"]
    readonly_fields = ["created_at", "updated_at", "started_at", "finished_at"]
    fields = [
        "job_type",
        "job_key",
        "payload",
        "status",
        "attempts",
        "max_attempts",
        "available_at",
        "started_at",
        "finished_at",
        "last_error",
        "created_at",
        "updated_at",
    ]


@admin.register(NewsItem)
class NewsItemAdmin(admin.ModelAdmin):
    list_display = ["id", "title", "date", "timestamp", "created_at", "updated_at"]
    list_filter = ["created_at", "updated_at"]
    search_fields = ["title", "summary", "tags", "link"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(LiteratureItem)
class LiteratureItemAdmin(admin.ModelAdmin):
    list_display = ["id", "title", "faculty", "category", "publishing_date", "created_at"]
    list_filter = ["faculty", "category", "created_at"]
    search_fields = ["title", "authors", "description", "handle", "source_id"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(ScheduleEntry)
class ScheduleEntryAdmin(admin.ModelAdmin):
    list_display = ["id", "group_number", "week", "day", "time", "matter", "teacher", "created_at"]
    list_filter = ["group_number", "week", "day", "created_at"]
    search_fields = ["group_number", "matter", "teacher", "classroom", "frame"]
    readonly_fields = ["created_at", "updated_at"]
