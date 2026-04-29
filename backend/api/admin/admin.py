from django.contrib import admin
from api.models import (
    User,
    UserSession,
    UserProfileMedia,
    MediaOptimization,
    Administration,
    UserBan,
    TelegramBinding,
)


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ["id", "fullname", "student_code", "faculty", "created_at", "last_login", "twofa_enabled"]
    list_filter = ["faculty", "created_at", "twofa_enabled", "twofa_method"]
    search_fields = ["fullname", "student_code", "id"]
    ordering = ['-created_at']
    
    # Все поля доступны для редактирования
    fields = [
        'fullname', 'student_code', 'faculty', 'password', 
        'created_at', 'last_login',
        'twofa_enabled', 'twofa_method'
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
        ban_count = UserBan.objects.filter(user_id=obj.id, is_active=True).count()
        if ban_count > 0:
            info.append(f"Активные баны: {ban_count}")
        
        # Админ права
        from api.models import Administration
        admin_count = Administration.objects.filter(administrator=obj, is_active=True).count()
        if admin_count > 0:
            info.append(f"Админ права: {admin_count}")
        
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
            UserBan.objects.filter(user_id=obj.id).delete()
            
            # Удаляем администраторские записи
            from api.models import Administration
            Administration.objects.filter(administrator=obj).delete()
            
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
    list_display = ['id', 'student_code', 'user_id', 'is_active', 'created_at', 'ban_date', 'banned_by_id']
    list_filter = ['is_active', 'created_at', 'ban_date']
    search_fields = ['student_code', 'ban_reason', 'banned_by_id']
    readonly_fields = ['created_at', 'ban_date']
    fields = ['student_code', 'user_id', 'banned_by_id', 'ban_reason', 'is_active', 'created_at', 'ban_date', 'ban_duration_seconds']


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
