from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0020_rename_literature__handle_b0d3c0_idx_literature__handle_9e31d5_idx"),
    ]

    operations = [
        migrations.AddField(
            model_name="backgroundjob",
            name="job_key",
            field=models.CharField(blank=True, max_length=160, null=True, unique=True),
        ),
    ]
