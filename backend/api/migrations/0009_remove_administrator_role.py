from django.db import migrations, models


def migrate_administrator_role_to_student(apps, schema_editor):
    User = apps.get_model("api", "User")
    User.objects.filter(role="administrator").update(role="student")


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0008_user_role"),
    ]

    operations = [
        migrations.RunPython(
            migrate_administrator_role_to_student,
            migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name="user",
            name="role",
            field=models.CharField(
                choices=[
                    ("student", "Студент"),
                    ("teacher", "Преподаватель"),
                    ("chairperson", "Председатель"),
                    ("moderator", "Модератор"),
                ],
                default="student",
                max_length=20,
            ),
        ),
    ]
