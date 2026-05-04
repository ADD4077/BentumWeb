from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0021_backgroundjob_job_key"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="literatureitem",
            name="unique_literature_item_per_faculty_category",
        ),
    ]
