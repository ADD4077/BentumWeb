from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0023_activityevent"),
    ]

    operations = [
        migrations.CreateModel(
            name="SupportThread",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("subject", models.CharField(max_length=255)),
                (
                    "request_type",
                    models.CharField(
                        choices=[
                            ("support", "Поддержка"),
                            ("bug", "Ошибка"),
                            ("feature", "Предложение"),
                            ("question", "Вопрос"),
                        ],
                        db_index=True,
                        default="support",
                        max_length=20,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("open", "Открыто"),
                            ("answered", "Есть ответ"),
                            ("closed", "Закрыто"),
                        ],
                        db_index=True,
                        default="open",
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("last_message_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "assigned_moderator",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="assigned_support_threads",
                        to="api.user",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="support_threads",
                        to="api.user",
                    ),
                ),
            ],
            options={
                "db_table": "support_threads",
            },
        ),
        migrations.CreateModel(
            name="SupportMessage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("body", models.TextField()),
                ("is_moderator_reply", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "author",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="support_messages",
                        to="api.user",
                    ),
                ),
                (
                    "thread",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="messages",
                        to="api.supportthread",
                    ),
                ),
            ],
            options={
                "db_table": "support_messages",
            },
        ),
        migrations.AddIndex(
            model_name="supportthread",
            index=models.Index(fields=["status", "last_message_at"], name="support_thr_status_3c0aea_idx"),
        ),
        migrations.AddIndex(
            model_name="supportthread",
            index=models.Index(fields=["request_type", "last_message_at"], name="support_thr_request_d185ef_idx"),
        ),
        migrations.AddIndex(
            model_name="supportthread",
            index=models.Index(fields=["created_by", "last_message_at"], name="support_thr_created_8dc699_idx"),
        ),
        migrations.AddIndex(
            model_name="supportmessage",
            index=models.Index(fields=["thread", "created_at"], name="support_mes_thread__a073b8_idx"),
        ),
        migrations.AddIndex(
            model_name="supportmessage",
            index=models.Index(fields=["author", "created_at"], name="support_mes_author__b57e66_idx"),
        ),
    ]
