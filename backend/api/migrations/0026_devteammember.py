from django.db import migrations, models


def seed_dev_team(apps, schema_editor):
    DevTeamMember = apps.get_model("api", "DevTeamMember")

    members = [
        {
            "fullname": "Свиридович Павел",
            "student_code": "1090352523",
            "role": "Тимлид / Разработчик",
            "description": "Организовал процесс разработки и следит за качеством продукта.",
            "display_order": 1,
        },
        {
            "fullname": "Смоленский Андрей",
            "student_code": "1090372523",
            "role": "Разработчик / Системный администратор",
            "description": "Python-специалист. Разработал API и обеспечил быструю работу серверной части.",
            "display_order": 2,
        },
        {
            "fullname": "Гончарик Александр",
            "student_code": "1090352506",
            "role": "Промоутер / Frontend-разработчик",
            "description": "React-эксперт, создал интерфейс и любит собирать красивые и функциональные компоненты.",
            "display_order": 3,
        },
        {
            "fullname": "Абраменко Александр",
            "student_code": "1090352501",
            "role": "2D / 3D дизайнер",
            "description": "Продумал визуальный стиль платформы и пользовательский опыт.",
            "display_order": 4,
        },
        {
            "fullname": "Альшевский Алексей",
            "student_code": "1030522501",
            "role": "Тестировщик",
            "description": "Следит за качеством продукта, проверяет сценарии и помогает находить баги.",
            "display_order": 5,
        },
    ]

    for member in members:
        DevTeamMember.objects.update_or_create(
            fullname=member["fullname"],
            defaults={**member, "is_active": True},
        )


def unseed_dev_team(apps, schema_editor):
    DevTeamMember = apps.get_model("api", "DevTeamMember")
    DevTeamMember.objects.filter(
        fullname__in=[
            "Свиридович Павел",
            "Смоленский Андрей",
            "Гончарик Александр",
            "Абраменко Александр",
            "Альшевский Алексей",
        ]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0025_usersettings_privacy_notifications"),
    ]

    operations = [
        migrations.CreateModel(
            name="DevTeamMember",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("fullname", models.CharField(max_length=100)),
                ("student_code", models.CharField(blank=True, db_index=True, max_length=10)),
                ("role", models.CharField(max_length=120)),
                ("description", models.TextField(blank=True)),
                ("display_order", models.PositiveIntegerField(db_index=True, default=0)),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "dev_team_members",
                "ordering": ["display_order", "id"],
            },
        ),
        migrations.AddIndex(
            model_name="devteammember",
            index=models.Index(fields=["is_active", "display_order"], name="dev_team_me_is_acti_8b45e6_idx"),
        ),
        migrations.AddIndex(
            model_name="devteammember",
            index=models.Index(fields=["student_code"], name="dev_team_me_student_77adfc_idx"),
        ),
        migrations.RunPython(seed_dev_team, unseed_dev_team),
    ]
