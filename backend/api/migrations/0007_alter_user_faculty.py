from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0006_rename_background__status_303699_idx_background__status_d47efd_idx_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="faculty",
            field=models.CharField(max_length=255),
        ),
    ]
