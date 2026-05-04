from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0024_supportthread_supportmessage"),
    ]

    operations = [
        migrations.AddField(
            model_name="usersettings",
            name="allow_telegram_discovery",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="usersettings",
            name="notify_security_events",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="usersettings",
            name="notify_support_replies",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="usersettings",
            name="show_faculty",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="usersettings",
            name="show_profile_in_community",
            field=models.BooleanField(default=True),
        ),
        migrations.AddIndex(
            model_name="usersettings",
            index=models.Index(
                fields=["notify_support_replies"],
                name="user_settin_notify__0ba528_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="usersettings",
            index=models.Index(
                fields=["notify_security_events"],
                name="user_settin_notify__29e11d_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="usersettings",
            index=models.Index(
                fields=["show_profile_in_community"],
                name="user_settin_show_pr_54fef8_idx",
            ),
        ),
    ]
