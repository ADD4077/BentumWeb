from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0019_literatureitem_source_fields"),
    ]

    operations = [
        migrations.RenameIndex(
            model_name="literatureitem",
            old_name="literature__handle_b0d3c0_idx",
            new_name="literature__handle_9e31d5_idx",
        ),
    ]
