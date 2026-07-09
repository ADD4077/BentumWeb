from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _extract_student_code(self, student_code=None, extra_fields=None):
        extra_fields = extra_fields or {}
        identifier = student_code or extra_fields.pop("username", None) or extra_fields.pop("student_code", None)
        if not identifier:
            raise ValueError("The student_code must be set")
        return str(identifier).strip()

    def create_user(self, student_code=None, password=None, **extra_fields):
        student_code = self._extract_student_code(student_code, extra_fields)
        fullname = extra_fields.pop("fullname", None) or student_code
        faculty = extra_fields.pop("faculty", None) or "ADMIN"

        user = self.model(
            student_code=student_code,
            fullname=fullname,
            faculty=faculty,
            **extra_fields,
        )
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        if user.created_at is None:
            user.created_at = timezone.now()
        user.save(using=self._db)
        from .referral_service import ReferralService

        ReferralService.ensure_user_referral_code(user)
        return user

    def create_superuser(self, student_code=None, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(student_code=student_code, password=password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
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
    referral_code = models.CharField(max_length=16, unique=True, null=True, blank=True)
    referred_by = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="referred_users",
    )
    referred_at = models.DateTimeField(null=True, blank=True)
    referral_source = models.CharField(max_length=32, blank=True, default="")
    created_at = models.DateTimeField(null=True, blank=True)
    twofa_enabled = models.BooleanField(default=False)
    twofa_method = models.CharField(max_length=20, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    auth_sync_managed = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = "student_code"
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "users"

    def __str__(self):
        return self.student_code


class UserSettings(models.Model):
    user = models.OneToOneField("User", on_delete=models.CASCADE, related_name="settings")
    notify_successful_login = models.BooleanField(default=True)
    notify_support_replies = models.BooleanField(default=True)
    notify_security_events = models.BooleanField(default=True)
    show_profile_in_community = models.BooleanField(default=True)
    allow_telegram_discovery = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_settings"
        indexes = [
            models.Index(fields=["notify_successful_login"]),
            models.Index(fields=["notify_support_replies"]),
            models.Index(fields=["notify_security_events"]),
            models.Index(fields=["show_profile_in_community"]),
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
    student_code = models.CharField(max_length=10, db_index=True)
    user = models.ForeignKey(
        "User",
        on_delete=models.CASCADE,
        related_name="bans",
        db_column="user_id",
    )
    banned_by = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        related_name="issued_bans",
        db_column="banned_by_id",
        null=True,
        blank=True,
    )
    ban_date = models.DateTimeField(auto_now_add=True)
    ban_duration_seconds = models.IntegerField()
    ban_reason = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "user_bans"
        indexes = [
            models.Index(fields=["student_code", "is_active"]),
            models.Index(fields=["user", "is_active"]),
            models.Index(fields=["banned_by"]),
            models.Index(fields=["ban_date"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"Бан: {self.student_code} (до {self.ban_date})"


class TelegramBinding(models.Model):
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
    PRIORITY_HIGH = 300
    PRIORITY_MEDIUM = 200
    PRIORITY_LOW = 100

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_RUNNING, "Running"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_FAILED, "Failed"),
    ]
    PRIORITY_CHOICES = [
        (PRIORITY_HIGH, "High"),
        (PRIORITY_MEDIUM, "Medium"),
        (PRIORITY_LOW, "Low"),
    ]

    job_type = models.CharField(max_length=100, db_index=True)
    job_key = models.CharField(max_length=255, blank=True, default="", db_index=True)
    payload = models.JSONField(default=dict, blank=True)
    priority = models.PositiveSmallIntegerField(
        choices=PRIORITY_CHOICES,
        default=PRIORITY_MEDIUM,
        db_index=True,
    )
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
            models.Index(fields=["status", "priority", "available_at"]),
            models.Index(fields=["job_type", "status"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.job_type} [{self.status}]"


class ActivityEvent(models.Model):
    EVENT_USER_UNBANNED = "user_unbanned"
    EVENT_ADMIN_REMOVED = "admin_removed"
    EVENT_TWOFA_ENABLED = "twofa_enabled"
    EVENT_TWOFA_DISABLED = "twofa_disabled"
    EVENT_TELEGRAM_UNLINKED = "telegram_unlinked"

    EVENT_CHOICES = [
        (EVENT_USER_UNBANNED, "Пользователь разблокирован"),
        (EVENT_ADMIN_REMOVED, "Снятие администратора"),
        (EVENT_TWOFA_ENABLED, "2FA включен"),
        (EVENT_TWOFA_DISABLED, "2FA отключен"),
        (EVENT_TELEGRAM_UNLINKED, "Telegram отвязан"),
    ]

    event_type = models.CharField(max_length=40, choices=EVENT_CHOICES, db_index=True)
    user = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="activity_events",
    )
    actor = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="performed_activity_events",
    )
    details = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "activity_events"
        indexes = [
            models.Index(fields=["event_type", "created_at"]),
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["actor", "created_at"]),
        ]

    def __str__(self):
        return f"{self.event_type} @ {self.created_at}"


class UserNotification(models.Model):
    TYPE_LOGIN_SUCCESS = "login_success"
    TYPE_SUPPORT_REPLY = "support_reply"
    TYPE_PASSWORD_CHANGED = "password_changed"
    TYPE_TWOFA_ENABLED = "twofa_enabled"
    TYPE_TWOFA_DISABLED = "twofa_disabled"

    TYPE_CHOICES = [
        (TYPE_LOGIN_SUCCESS, "Успешный вход"),
        (TYPE_SUPPORT_REPLY, "Ответ поддержки"),
        (TYPE_PASSWORD_CHANGED, "Смена пароля"),
        (TYPE_TWOFA_ENABLED, "2FA включена"),
        (TYPE_TWOFA_DISABLED, "2FA отключена"),
    ]

    user = models.ForeignKey("User", on_delete=models.CASCADE, related_name="notifications")
    notification_type = models.CharField(max_length=40, choices=TYPE_CHOICES, db_index=True)
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "user_notifications"
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["user", "is_read", "created_at"]),
            models.Index(fields=["notification_type", "created_at"]),
        ]

    def __str__(self):
        return f"{self.user.student_code}: {self.notification_type}"


class DevTeamMember(models.Model):
    fullname = models.CharField(max_length=100)
    student_code = models.CharField(max_length=10, blank=True, db_index=True)
    role = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    display_order = models.PositiveIntegerField(default=0, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "dev_team_members"
        ordering = ["display_order", "id"]
        indexes = [
            models.Index(fields=["is_active", "display_order"]),
            models.Index(fields=["student_code"]),
        ]

    def __str__(self):
        return f"{self.fullname} - {self.role}"


class SupportThread(models.Model):
    STATUS_OPEN = "open"
    STATUS_ANSWERED = "answered"
    STATUS_CLOSED = "closed"

    STATUS_CHOICES = [
        (STATUS_OPEN, "Открыто"),
        (STATUS_ANSWERED, "Есть ответ"),
        (STATUS_CLOSED, "Закрыто"),
    ]

    TYPE_SUPPORT = "support"
    TYPE_BUG = "bug"
    TYPE_FEATURE = "feature"
    TYPE_QUESTION = "question"

    TYPE_CHOICES = [
        (TYPE_SUPPORT, "Поддержка"),
        (TYPE_BUG, "Ошибка"),
        (TYPE_FEATURE, "Предложение"),
        (TYPE_QUESTION, "Вопрос"),
    ]

    created_by = models.ForeignKey("User", on_delete=models.CASCADE, related_name="support_threads")
    assigned_moderator = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_support_threads",
    )
    subject = models.CharField(max_length=255)
    request_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_SUPPORT, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_message_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "support_threads"
        indexes = [
            models.Index(fields=["status", "last_message_at"]),
            models.Index(fields=["request_type", "last_message_at"]),
            models.Index(fields=["created_by", "last_message_at"]),
        ]

    def __str__(self):
        return f"{self.subject} [{self.status}]"


class SupportMessage(models.Model):
    thread = models.ForeignKey("SupportThread", on_delete=models.CASCADE, related_name="messages")
    author = models.ForeignKey("User", on_delete=models.CASCADE, related_name="support_messages")
    body = models.TextField()
    is_moderator_reply = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "support_messages"
        indexes = [
            models.Index(fields=["thread", "created_at"]),
            models.Index(fields=["author", "created_at"]),
        ]

    def __str__(self):
        return f"{self.thread_id}: {self.author_id}"


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


class Event(models.Model):
    STATUS_ACTIVE = "active"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_COMPLETED = "completed"

    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Активно"),
        (STATUS_IN_PROGRESS, "В процессе"),
        (STATUS_COMPLETED, "Завершено"),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField()
    location = models.CharField(max_length=255, blank=True, default="")
    starts_at = models.DateTimeField(db_index=True)
    max_participants = models.PositiveIntegerField(default=10)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE, db_index=True)
    banner_path = models.CharField(max_length=500, blank=True)
    banner_original_filename = models.CharField(max_length=255, blank=True)
    banner_file_size = models.IntegerField(default=0)
    banner_width = models.IntegerField(null=True, blank=True)
    banner_height = models.IntegerField(null=True, blank=True)
    created_by = models.ForeignKey("User", on_delete=models.CASCADE, related_name="created_events")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "events"
        indexes = [
            models.Index(fields=["status", "starts_at"]),
            models.Index(fields=["created_by", "created_at"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return self.title

    @property
    def effective_status(self):
        if self.status == self.STATUS_COMPLETED:
            return self.STATUS_COMPLETED
        if self.starts_at and timezone.now() >= self.starts_at:
            return self.STATUS_IN_PROGRESS
        return self.STATUS_ACTIVE

    def get_effective_status_display(self):
        if self.effective_status == self.STATUS_IN_PROGRESS:
            return "В процессе"
        if self.effective_status == self.STATUS_COMPLETED:
            return "Завершено"
        return "Активно"


class EventParticipation(models.Model):
    event = models.ForeignKey("Event", on_delete=models.CASCADE, related_name="participants")
    user = models.ForeignKey("User", on_delete=models.CASCADE, related_name="event_participations")
    attended = models.BooleanField(default=False)
    attended_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "event_participations"
        constraints = [
            models.UniqueConstraint(fields=["event", "user"], name="uniq_event_participant"),
        ]
        indexes = [
            models.Index(fields=["event", "created_at"]),
            models.Index(fields=["user", "created_at"]),
        ]

    def __str__(self):
        return f"{self.event_id}:{self.user_id}"
