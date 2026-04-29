from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0018_rename_literature__faculty_746d57_idx_literature__faculty_bf0899_idx_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="literatureitem",
            name="handle",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="literatureitem",
            name="source_id",
            field=models.BigIntegerField(blank=True, null=True, unique=True),
        ),
        migrations.AddIndex(
            model_name="literatureitem",
            index=models.Index(fields=["handle"], name="literature__handle_b0d3c0_idx"),
        ),
    ]
