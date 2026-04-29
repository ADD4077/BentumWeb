from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0012_remove_user_email"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="notify_successful_login",
            field=models.BooleanField(default=True),
        ),
    ]
