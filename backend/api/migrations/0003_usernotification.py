from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0002_remove_usersettings_show_faculty"),
    ]

    operations = [
        migrations.CreateModel(
            name="UserNotification",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "notification_type",
                    models.CharField(
                        choices=[
                            ("login_success", "Успешный вход"),
                            ("support_reply", "Ответ поддержки"),
                            ("password_changed", "Смена пароля"),
                            ("twofa_enabled", "2FA включена"),
                            ("twofa_disabled", "2FA отключена"),
                        ],
                        db_index=True,
                        max_length=40,
                    ),
                ),
                ("title", models.CharField(max_length=255)),
                ("body", models.TextField(blank=True)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("is_read", models.BooleanField(db_index=True, default=False)),
                ("read_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="notifications",
                        to="api.user",
                    ),
                ),
            ],
            options={
                "db_table": "user_notifications",
            },
        ),
        migrations.AddIndex(
            model_name="usernotification",
            index=models.Index(fields=["user", "created_at"], name="user_notifi_user_id_9328f3_idx"),
        ),
        migrations.AddIndex(
            model_name="usernotification",
            index=models.Index(fields=["user", "is_read", "created_at"], name="user_notifi_user_id_1efa6e_idx"),
        ),
        migrations.AddIndex(
            model_name="usernotification",
            index=models.Index(fields=["notification_type", "created_at"], name="user_notifi_notific_8b0a10_idx"),
        ),
    ]
