from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0007_alter_user_faculty"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="role",
            field=models.CharField(
                choices=[
                    ("student", "Студент"),
                    ("teacher", "Преподаватель"),
                    ("chairperson", "Председатель"),
                    ("moderator", "Модератор"),
                    ("administrator", "Администратор"),
                ],
                default="student",
                max_length=20,
            ),
        ),
    ]
