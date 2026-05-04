from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0016_content_mysql_models"),
    ]

    operations = [
        migrations.AlterField(
            model_name="newsitem",
            name="link",
            field=models.CharField(max_length=255, unique=True),
        ),
    ]
