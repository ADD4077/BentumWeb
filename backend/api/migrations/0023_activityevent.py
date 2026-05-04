from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0022_remove_literatureitem_unique_literature_item_per_faculty_category"),
    ]

    operations = [
        migrations.CreateModel(
            name="ActivityEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "event_type",
                    models.CharField(
                        choices=[
                            ("user_unbanned", "Пользователь разблокирован"),
                            ("admin_removed", "Снятие администратора"),
                            ("twofa_enabled", "2FA включен"),
                            ("twofa_disabled", "2FA отключен"),
                            ("telegram_unlinked", "Telegram отвязан"),
                        ],
                        db_index=True,
                        max_length=40,
                    ),
                ),
                ("details", models.TextField(blank=True)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "actor",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="performed_activity_events",
                        to="api.user",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="activity_events",
                        to="api.user",
                    ),
                ),
            ],
            options={
                "db_table": "activity_events",
            },
        ),
        migrations.AddIndex(
            model_name="activityevent",
            index=models.Index(fields=["event_type", "created_at"], name="activity_ev_event_t_7e6fd0_idx"),
        ),
        migrations.AddIndex(
            model_name="activityevent",
            index=models.Index(fields=["user", "created_at"], name="activity_ev_user_id_0d4e0d_idx"),
        ),
        migrations.AddIndex(
            model_name="activityevent",
            index=models.Index(fields=["actor", "created_at"], name="activity_ev_actor_id_132eaf_idx"),
        ),
    ]
