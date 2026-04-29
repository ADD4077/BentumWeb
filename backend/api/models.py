from django.db import models
from django.utils import timezone


class User(models.Model):
    ROLE_STUDENT = "student"
    ROLE_TEACHER = "teacher"
    ROLE_CHAIRPERSON = "chairperson"
    ROLE_MODERATOR = "moderator"

    ROLE_CHOICES = [
        (ROLE_STUDENT, "Студент"),
        (ROLE_TEACHER, "Преподаватель"),
        (ROLE_CHAIRPERSON, "Председатель"),
        (ROLE_MODERATOR, "Модератор"),
    ]

    fullname = models.CharField(max_length=100)
    faculty = models.CharField(max_length=255)
    student_code = models.CharField(max_length=10, unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_STUDENT)
    password = models.CharField(max_length=128)
    created_at = models.DateTimeField(null=True, blank=True)
    last_login = models.DateTimeField(null=True, blank=True)
    twofa_enabled = models.BooleanField(default=False)
    twofa_method = models.CharField(max_length=20, null=True, blank=True)

    class Meta:
        db_table = "users"

    def __str__(self):
        return self.student_code


class UserSettings(models.Model):
    user = models.OneToOneField("User", on_delete=models.CASCADE, related_name="settings")
    notify_successful_login = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_settings"
        indexes = [
            models.Index(fields=["notify_successful_login"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"Settings: {self.user.student_code}"


class UserSession(models.Model):
    student_code = models.CharField(max_length=10, db_index=True)
    session_key = models.CharField(max_length=40, unique=True)
    user_agent = models.TextField(blank=True, null=True)
    browser = models.CharField(max_length=100, blank=True, null=True)
    os = models.CharField(max_length=100, blank=True, null=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_sessions"
        indexes = [
            models.Index(fields=["student_code", "created_at"]),
            models.Index(fields=["student_code", "last_activity"]),
            models.Index(fields=["browser"]),
            models.Index(fields=["os"]),
        ]


class UserProfileMedia(models.Model):
    """Модель для хранения медиафайлов пользователей."""

    user = models.ForeignKey("User", on_delete=models.CASCADE, related_name="media_files")
    media_type = models.CharField(
        max_length=10,
        choices=[
            ("avatar", "Аватар"),
            ("banner", "Баннер"),
        ],
    )
    original_filename = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)
    file_size = models.IntegerField()
    mime_type = models.CharField(max_length=100)
    width = models.IntegerField(null=True, blank=True)
    height = models.IntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=False)
    created_at = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = "user_profile_media"
        indexes = [
            models.Index(fields=["user", "media_type", "is_active"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.user.student_code} - {self.media_type}"


class MediaOptimization(models.Model):
    """Модель для хранения оптимизированных версий изображений."""

    original_media = models.ForeignKey(
        "UserProfileMedia",
        on_delete=models.CASCADE,
        related_name="optimized_versions",
    )
    size_type = models.CharField(
        max_length=20,
        choices=[
            ("thumbnail", "Миниатюра 150x150"),
            ("small", "Маленький 300x300"),
            ("medium", "Средний 800x600"),
            ("large", "Большой 1200x800"),
        ],
    )
    file_path = models.CharField(max_length=500)
    file_size = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "media_optimizations"
        indexes = [
            models.Index(fields=["original_media", "size_type"]),
        ]


class Administration(models.Model):
    """Модель для отслеживания системных администраторов."""

    administrator = models.ForeignKey("User", on_delete=models.CASCADE, related_name="admin_assignments")
    appointed_by = models.ForeignKey(
        "User",
        on_delete=models.CASCADE,
        related_name="appointed_admins",
        null=True,
        blank=True,
    )
    appointed_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True, help_text="Примечания о назначении")

    class Meta:
        db_table = "administration"
        indexes = [
            models.Index(fields=["administrator", "is_active"]),
            models.Index(fields=["appointed_by"]),
            models.Index(fields=["appointed_at"]),
        ]

    def __str__(self):
        return f"Админ: {self.administrator.student_code} (назначен {self.appointed_at})"


class UserBan(models.Model):
    """Модель для хранения информации о блокировках пользователей."""

    student_code = models.CharField(max_length=10, db_index=True)
    user_id = models.IntegerField(db_index=True)
    banned_by_id = models.IntegerField(null=True, blank=True)
    ban_date = models.DateTimeField(auto_now_add=True)
    ban_duration_seconds = models.IntegerField()
    ban_reason = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "user_bans"
        indexes = [
            models.Index(fields=["student_code", "is_active"]),
            models.Index(fields=["user_id", "is_active"]),
            models.Index(fields=["banned_by_id"]),
            models.Index(fields=["ban_date"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"Бан: {self.student_code} (до {self.ban_date})"


class TelegramBinding(models.Model):
    """Модель для хранения привязки Telegram-аккаунтов к пользователям."""

    user = models.OneToOneField("User", on_delete=models.CASCADE, related_name="telegram_binding")
    telegram_id = models.BigIntegerField(default=0, db_index=True)
    telegram_username = models.CharField(max_length=32, blank=True, null=True)
    telegram_first_name = models.CharField(max_length=64, blank=True, null=True)
    telegram_last_name = models.CharField(max_length=64, blank=True, null=True)
    binding_token = models.CharField(max_length=64, unique=True, db_index=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "telegram_bindings"
        indexes = [
            models.Index(fields=["user", "is_active"]),
            models.Index(fields=["telegram_id"]),
            models.Index(fields=["binding_token"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"Привязка Telegram: {self.user.student_code} -> @{self.telegram_username or self.telegram_id}"


class BackgroundJob(models.Model):
    STATUS_PENDING = "pending"
    STATUS_RUNNING = "running"
    STATUS_COMPLETED = "completed"
    STATUS_FAILED = "failed"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_RUNNING, "Running"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_FAILED, "Failed"),
    ]

    job_type = models.CharField(max_length=100, db_index=True)
    payload = models.JSONField(default=dict, blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        db_index=True,
    )
    attempts = models.PositiveIntegerField(default=0)
    max_attempts = models.PositiveIntegerField(default=3)
    available_at = models.DateTimeField(default=timezone.now, db_index=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "background_jobs"
        indexes = [
            models.Index(fields=["status", "available_at"]),
            models.Index(fields=["job_type", "status"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.job_type} [{self.status}]"


class LiteratureItem(models.Model):
    source_id = models.BigIntegerField(null=True, blank=True, unique=True)
    handle = models.CharField(max_length=255, blank=True)
    title = models.CharField(max_length=255)
    faculty = models.CharField(max_length=64, blank=True)
    category = models.CharField(max_length=191, blank=True)
    authors = models.TextField(blank=True)
    publishing_date = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    image_url = models.URLField(max_length=1000, blank=True)
    download_size = models.CharField(max_length=100, blank=True)
    download_link = models.URLField(max_length=1000, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "literature_items"
        constraints = [
            models.UniqueConstraint(
                fields=["title", "faculty", "category"],
                name="unique_literature_item_per_faculty_category",
            )
        ]
        indexes = [
            models.Index(fields=["handle"]),
            models.Index(fields=["faculty"]),
            models.Index(fields=["category"]),
            models.Index(fields=["publishing_date"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return self.title


class NewsItem(models.Model):
    title = models.CharField(max_length=500)
    link = models.CharField(max_length=255, unique=True)
    date = models.CharField(max_length=100, blank=True)
    timestamp = models.BigIntegerField(default=0, db_index=True)
    summary = models.TextField(blank=True)
    tags = models.TextField(blank=True)
    image_url = models.URLField(max_length=1000, blank=True)
    reading_time = models.IntegerField(default=5)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "news_items"
        indexes = [
            models.Index(fields=["timestamp"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return self.title


class ScheduleEntry(models.Model):
    group_number = models.CharField(max_length=20, db_index=True)
    week = models.IntegerField()
    day = models.CharField(max_length=32)
    time = models.CharField(max_length=32)
    matter = models.CharField(max_length=500, blank=True)
    teacher = models.CharField(max_length=255, blank=True)
    frame = models.CharField(max_length=255, blank=True)
    classroom = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "schedule_entries"
        indexes = [
            models.Index(fields=["group_number", "day", "week"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.group_number}: {self.day} {self.time}"
