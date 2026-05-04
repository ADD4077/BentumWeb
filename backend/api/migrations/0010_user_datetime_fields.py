from datetime import datetime, timezone as dt_timezone

from django.db import migrations, models
from django.utils import timezone


def _from_unix(value):
    if value in (None, ""):
        return None
    try:
        return datetime.fromtimestamp(int(value), tz=dt_timezone.utc)
    except Exception:
        return None


def forwards(apps, schema_editor):
    User = apps.get_model("api", "User")
    for user in User.objects.all().iterator():
        user.created_at_dt = _from_unix(user.created_at)
        user.last_login_dt = _from_unix(user.last_login)
        user.save(update_fields=["created_at_dt", "last_login_dt"])


def backwards(apps, schema_editor):
    User = apps.get_model("api", "User")
    for user in User.objects.all().iterator():
        user.created_at = int(user.created_at_dt.timestamp()) if user.created_at_dt else None
        user.last_login = int(user.last_login_dt.timestamp()) if user.last_login_dt else None
        user.save(update_fields=["created_at", "last_login"])


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0009_remove_administrator_role"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="created_at_dt",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="last_login_dt",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(forwards, backwards),
        migrations.RemoveField(model_name="user", name="created_at"),
        migrations.RemoveField(model_name="user", name="last_login"),
        migrations.RenameField(model_name="user", old_name="created_at_dt", new_name="created_at"),
        migrations.RenameField(model_name="user", old_name="last_login_dt", new_name="last_login"),
    ]
