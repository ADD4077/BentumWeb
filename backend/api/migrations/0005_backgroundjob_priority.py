from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0004_rename_user_notifi_user_id_9328f3_idx_user_notifi_user_id_94ad44_idx_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="backgroundjob",
            name="priority",
            field=models.PositiveSmallIntegerField(
                choices=[(300, "High"), (200, "Medium"), (100, "Low")],
                db_index=True,
                default=200,
            ),
        ),
        migrations.RemoveIndex(
            model_name="backgroundjob",
            name="background__status_d47efd_idx",
        ),
        migrations.AddIndex(
            model_name="backgroundjob",
            index=models.Index(
                fields=["status", "priority", "available_at"],
                name="background__status_32fd8e_idx",
            ),
        ),
    ]
