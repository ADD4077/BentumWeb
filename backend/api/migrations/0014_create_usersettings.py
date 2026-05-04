from django.db import migrations, models


def copy_user_notification_settings(apps, schema_editor):
    User = apps.get_model("api", "User")
    UserSettings = apps.get_model("api", "UserSettings")

    settings_to_create = []
    for user in User.objects.all().iterator():
        settings_to_create.append(
            UserSettings(
                user_id=user.id,
                notify_successful_login=getattr(user, "notify_successful_login", True),
            )
        )

    if settings_to_create:
        UserSettings.objects.bulk_create(settings_to_create, ignore_conflicts=True)


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0013_user_notify_successful_login"),
    ]

    operations = [
        migrations.CreateModel(
            name="UserSettings",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("notify_successful_login", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.OneToOneField(on_delete=models.deletion.CASCADE, related_name="settings", to="api.user")),
            ],
            options={
                "db_table": "user_settings",
            },
        ),
        migrations.AddIndex(
            model_name="usersettings",
            index=models.Index(fields=["notify_successful_login"], name="user_settin_notify__74a3d9_idx"),
        ),
        migrations.AddIndex(
            model_name="usersettings",
            index=models.Index(fields=["created_at"], name="user_settin_created_4ea7fd_idx"),
        ),
        migrations.RunPython(copy_user_notification_settings, migrations.RunPython.noop),
    ]
