from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0009_rename_events_status_e0b3fe_idx_events_status_a8c13d_idx_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="eventparticipation",
            name="attended",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="eventparticipation",
            name="attended_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
