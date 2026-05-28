from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0007_user_referrals"),
    ]

    operations = [
        migrations.CreateModel(
            name="Event",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=255)),
                ("description", models.TextField()),
                ("starts_at", models.DateTimeField(db_index=True)),
                ("max_participants", models.PositiveIntegerField(default=10)),
                ("status", models.CharField(choices=[("active", "Активно"), ("in_progress", "В процессе"), ("completed", "Завершено")], db_index=True, default="active", max_length=20)),
                ("banner_path", models.CharField(blank=True, max_length=500)),
                ("banner_original_filename", models.CharField(blank=True, max_length=255)),
                ("banner_file_size", models.IntegerField(default=0)),
                ("banner_width", models.IntegerField(blank=True, null=True)),
                ("banner_height", models.IntegerField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("created_by", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="created_events", to="api.user")),
            ],
            options={"db_table": "events"},
        ),
        migrations.CreateModel(
            name="EventParticipation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("event", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="participants", to="api.event")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="event_participations", to="api.user")),
            ],
            options={"db_table": "event_participations"},
        ),
        migrations.AddIndex(
            model_name="event",
            index=models.Index(fields=["status", "starts_at"], name="events_status_e0b3fe_idx"),
        ),
        migrations.AddIndex(
            model_name="event",
            index=models.Index(fields=["created_by", "created_at"], name="events_created_4231f1_idx"),
        ),
        migrations.AddIndex(
            model_name="event",
            index=models.Index(fields=["created_at"], name="events_created_57e4ee_idx"),
        ),
        migrations.AddIndex(
            model_name="eventparticipation",
            index=models.Index(fields=["event", "created_at"], name="event_partic_event_i_2efd3c_idx"),
        ),
        migrations.AddIndex(
            model_name="eventparticipation",
            index=models.Index(fields=["user", "created_at"], name="event_partic_user_id_ea6a33_idx"),
        ),
        migrations.AddConstraint(
            model_name="eventparticipation",
            constraint=models.UniqueConstraint(fields=("event", "user"), name="uniq_event_participant"),
        ),
    ]
