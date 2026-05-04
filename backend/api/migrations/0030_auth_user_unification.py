from django.conf import settings
from django.db import migrations, models


def sync_existing_admin_users(apps, schema_editor):
    User = apps.get_model("api", "User")
    Administration = apps.get_model("api", "Administration")

    admin_user_ids = set(
        Administration.objects.filter(is_active=True).values_list("administrator_id", flat=True)
    )

    for user in User.objects.filter(id__in=admin_user_ids):
        updates = []
        if not user.is_staff:
            user.is_staff = True
            updates.append("is_staff")
        if not user.is_superuser:
            user.is_superuser = True
            updates.append("is_superuser")
        if updates:
            user.auth_sync_managed = True
            updates.append("auth_sync_managed")
            user.save(update_fields=updates)


class Migration(migrations.Migration):

    dependencies = [
        ("auth", "0012_alter_user_first_name_max_length"),
        ("api", "0029_remove_userban_user_bans_user_id_0ec7f3_idx_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="auth_sync_managed",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="user",
            name="groups",
            field=models.ManyToManyField(
                blank=True,
                help_text="The groups this user belongs to. A user will get all permissions granted to each of their groups.",
                related_name="user_set",
                related_query_name="user",
                to="auth.group",
                verbose_name="groups",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="is_active",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="user",
            name="is_staff",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="user",
            name="is_superuser",
            field=models.BooleanField(
                default=False,
                help_text="Designates that this user has all permissions without explicitly assigning them.",
                verbose_name="superuser status",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="user_permissions",
            field=models.ManyToManyField(
                blank=True,
                help_text="Specific permissions for this user.",
                related_name="user_set",
                related_query_name="user",
                to="auth.permission",
                verbose_name="user permissions",
            ),
        ),
        migrations.RunPython(sync_existing_admin_users, migrations.RunPython.noop),
    ]
