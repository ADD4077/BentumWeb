from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0014_create_usersettings"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="user",
            name="notify_successful_login",
        ),
    ]
