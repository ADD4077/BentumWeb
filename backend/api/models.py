from django.db import models

class User(models.Model):
    fullname = models.CharField(max_length=100)
    faculty = models.CharField(max_length=10)
    student_code = models.CharField(max_length=10, unique=True)
    bilet_code = models.CharField(max_length=7)
    is_banned = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(null=True, blank=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        db_table = 'users'

    def __str__(self):
        return self.student_code


class UserSession(models.Model):
    student_code = models.CharField(max_length=10, db_index=True)
    session_key = models.CharField(max_length=40, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_sessions'
        indexes = [
            models.Index(fields=['student_code', 'created_at']),
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
    created_at = models.DateTimeField(auto_now_add=True)
    
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