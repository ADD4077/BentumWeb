from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0010_eventparticipation_attendance"),
    ]

    operations = [
        migrations.AddField(
            model_name="event",
            name="location",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
    ]
