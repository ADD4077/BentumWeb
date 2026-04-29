from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0011_hash_legacy_user_passwords"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="user",
            name="email",
        ),
    ]
