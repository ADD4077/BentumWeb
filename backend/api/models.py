from django.db import models

class User(models.Model):
    fullname = models.CharField(max_length=100)
    faculty = models.CharField(max_length=10)
    student_code = models.CharField(max_length=10, unique=True)
    bilet_code = models.CharField(max_length=30)
    created_at = models.IntegerField(null=True, blank=True)
    last_login = models.IntegerField(null=True, blank=True)

    twofa_enabled = models.BooleanField(default=False)
    twofa_method = models.CharField(max_length=20, null=True, blank=True)

    class Meta:
        db_table = 'users'

    def __str__(self):
        return self.student_code


class UserSession(models.Model):
    student_code = models.CharField(max_length=10, db_index=True)
    session_key = models.CharField(max_length=40, unique=True)
    user_agent = models.TextField(blank=True, null=True)  # Полный User-Agent строка
    browser = models.CharField(max_length=100, blank=True, null=True)  # Браузер
    os = models.CharField(max_length=100, blank=True, null=True)  # Операционная система
    ip_address = models.GenericIPAddressField(blank=True, null=True)  # IP адрес
    created_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)  # Последняя активность

    class Meta:
        db_table = 'user_sessions'
        indexes = [
            models.Index(fields=['student_code', 'created_at']),
            models.Index(fields=['student_code', 'last_activity']),
            models.Index(fields=['browser']),
            models.Index(fields=['os']),
        ]


# Модели для медиа файлов
class UserProfileMedia(models.Model):
    """Модель для хранения медиа файлов пользователей"""
    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='media_files')
    media_type = models.CharField(max_length=10, choices=[
        ('avatar', 'Аватар'),
        ('banner', 'Баннер'),
    ])
    original_filename = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)
    file_size = models.IntegerField()  # в байтах
    mime_type = models.CharField(max_length=100)
    width = models.IntegerField(null=True, blank=True)
    height = models.IntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=False)  # Текущий активный медиа
    created_at = models.IntegerField(null=True, blank=True)
    
    class Meta:
        db_table = 'user_profile_media'
        indexes = [
            models.Index(fields=['user', 'media_type', 'is_active']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.student_code} - {self.media_type}"


class MediaOptimization(models.Model):
    """Модель для хранения оптимизированных версий изображений"""
    original_media = models.ForeignKey('UserProfileMedia', on_delete=models.CASCADE, related_name='optimized_versions')
    size_type = models.CharField(max_length=20, choices=[
        ('thumbnail', 'Миниатюра 150x150'),
        ('small', 'Маленький 300x300'),
        ('medium', 'Средний 800x600'),
        ('large', 'Большой 1200x800'),
    ])
    file_path = models.CharField(max_length=500)
    file_size = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'media_optimizations'
        indexes = [
            models.Index(fields=['original_media', 'size_type']),
        ]


class Administration(models.Model):
    """Модель для отслеживания администраторов системы"""
    administrator = models.ForeignKey('User', on_delete=models.CASCADE, related_name='admin_assignments')
    appointed_by = models.ForeignKey('User', on_delete=models.CASCADE, related_name='appointed_admins', null=True, blank=True)
    appointed_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True, help_text="Примечания о назначении")
    
    class Meta:
        db_table = 'administration'
        indexes = [
            models.Index(fields=['administrator', 'is_active']),
            models.Index(fields=['appointed_by']),
            models.Index(fields=['appointed_at']),
        ]
    
    def __str__(self):
        return f"Admin: {self.administrator.student_code} (назначен {self.appointed_at})"


class UserBan(models.Model):
    """Модель для хранения информации о блокировках пользователей"""
    student_code = models.CharField(max_length=10, db_index=True)
    user_id = models.IntegerField(db_index=True)
    banned_by_id = models.IntegerField(null=True, blank=True)  # ID администратора
    ban_date = models.DateTimeField(auto_now_add=True)
    ban_duration_seconds = models.IntegerField()  # Длительность в Unix секундах
    ban_reason = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_bans'
        indexes = [
            models.Index(fields=['student_code', 'is_active']),
            models.Index(fields=['user_id', 'is_active']),
            models.Index(fields=['banned_by_id']),
            models.Index(fields=['ban_date']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"Ban: {self.student_code} (до {self.ban_date})"


class TelegramBinding(models.Model):
    """Модель для хранения привязки Telegram аккаунтов к пользователям"""
    user = models.OneToOneField('User', on_delete=models.CASCADE, related_name='telegram_binding')
    telegram_id = models.BigIntegerField(default=0, db_index=True)  # 0 = не привязан
    telegram_username = models.CharField(max_length=32, blank=True, null=True)
    telegram_first_name = models.CharField(max_length=64, blank=True, null=True)
    telegram_last_name = models.CharField(max_length=64, blank=True, null=True)
    binding_token = models.CharField(max_length=64, unique=True, db_index=True)  # Токен для привязки
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'telegram_bindings'
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['telegram_id']),
            models.Index(fields=['binding_token']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"Telegram binding: {self.user.student_code} -> @{self.telegram_username or self.telegram_id}"