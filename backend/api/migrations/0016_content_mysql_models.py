from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0015_remove_user_notify_successful_login"),
    ]

    operations = [
        migrations.CreateModel(
            name="LiteratureItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=255)),
                ("faculty", models.CharField(blank=True, max_length=64)),
                ("category", models.CharField(blank=True, max_length=191)),
                ("authors", models.TextField(blank=True)),
                ("publishing_date", models.CharField(blank=True, max_length=50)),
                ("description", models.TextField(blank=True)),
                ("image_url", models.URLField(blank=True, max_length=1000)),
                ("download_size", models.CharField(blank=True, max_length=100)),
                ("download_link", models.URLField(blank=True, max_length=1000)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"db_table": "literature_items"},
        ),
        migrations.CreateModel(
            name="NewsItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=500)),
                ("link", models.CharField(max_length=500, unique=True)),
                ("date", models.CharField(blank=True, max_length=100)),
                ("timestamp", models.BigIntegerField(db_index=True, default=0)),
                ("summary", models.TextField(blank=True)),
                ("tags", models.TextField(blank=True)),
                ("image_url", models.URLField(blank=True, max_length=1000)),
                ("reading_time", models.IntegerField(default=5)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"db_table": "news_items"},
        ),
        migrations.CreateModel(
            name="ScheduleEntry",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("group_number", models.CharField(db_index=True, max_length=20)),
                ("week", models.IntegerField()),
                ("day", models.CharField(max_length=32)),
                ("time", models.CharField(max_length=32)),
                ("matter", models.CharField(blank=True, max_length=500)),
                ("teacher", models.CharField(blank=True, max_length=255)),
                ("frame", models.CharField(blank=True, max_length=255)),
                ("classroom", models.CharField(blank=True, max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"db_table": "schedule_entries"},
        ),
        migrations.AddConstraint(
            model_name="literatureitem",
            constraint=models.UniqueConstraint(
                fields=("title", "faculty", "category"),
                name="unique_literature_item_per_faculty_category",
            ),
        ),
        migrations.AddIndex(
            model_name="literatureitem",
            index=models.Index(fields=["faculty"], name="literature__faculty_746d57_idx"),
        ),
        migrations.AddIndex(
            model_name="literatureitem",
            index=models.Index(fields=["category"], name="literature__categor_95f493_idx"),
        ),
        migrations.AddIndex(
            model_name="literatureitem",
            index=models.Index(fields=["publishing_date"], name="literature__publish_28f064_idx"),
        ),
        migrations.AddIndex(
            model_name="literatureitem",
            index=models.Index(fields=["created_at"], name="literature__created_a4eeff_idx"),
        ),
        migrations.AddIndex(
            model_name="newsitem",
            index=models.Index(fields=["timestamp"], name="news_items_timestamp_5fd7c8_idx"),
        ),
        migrations.AddIndex(
            model_name="newsitem",
            index=models.Index(fields=["created_at"], name="news_items_created_0f3a96_idx"),
        ),
        migrations.AddIndex(
            model_name="scheduleentry",
            index=models.Index(fields=["group_number", "day", "week"], name="schedule_en_group_n_7e69c8_idx"),
        ),
        migrations.AddIndex(
            model_name="scheduleentry",
            index=models.Index(fields=["created_at"], name="schedule_en_created_beb901_idx"),
        ),
    ]
