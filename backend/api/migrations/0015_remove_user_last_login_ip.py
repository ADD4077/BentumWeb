# Generated manually to remove last_login_ip field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0014_alter_userprofilemedia_created_at'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='user',
            name='last_login_ip',
        ),
    ]
