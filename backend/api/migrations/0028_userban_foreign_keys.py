from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0027_rename_activity_ev_event_t_7e6fd0_idx_activity_ev_event_t_a0a379_idx_and_more"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            # Keep this migration state-only for now. Existing MySQL installs can have
            # legacy integer column definitions that are incompatible with direct FK
            # enforcement, but the ORM relationship still gives us safer code paths.
            database_operations=[],
            state_operations=[
                migrations.RemoveField(
                    model_name="userban",
                    name="user_id",
                ),
                migrations.RemoveField(
                    model_name="userban",
                    name="banned_by_id",
                ),
                migrations.AddField(
                    model_name="userban",
                    name="user",
                    field=models.ForeignKey(
                        db_column="user_id",
                        on_delete=models.deletion.CASCADE,
                        related_name="bans",
                        to="api.user",
                    ),
                ),
                migrations.AddField(
                    model_name="userban",
                    name="banned_by",
                    field=models.ForeignKey(
                        blank=True,
                        db_column="banned_by_id",
                        null=True,
                        on_delete=models.deletion.SET_NULL,
                        related_name="issued_bans",
                        to="api.user",
                    ),
                ),
            ],
        ),
    ]
