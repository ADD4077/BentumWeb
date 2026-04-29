from django.contrib.auth.hashers import identify_hasher, make_password
from django.db import migrations


def forwards(apps, schema_editor):
    User = apps.get_model("api", "User")
    for user in User.objects.exclude(password__isnull=True).exclude(password="").iterator():
        try:
            identify_hasher(user.password)
            continue
        except Exception:
            user.password = make_password(user.password)
            user.save(update_fields=["password"])


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0010_user_datetime_fields"),
    ]

    operations = [
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
