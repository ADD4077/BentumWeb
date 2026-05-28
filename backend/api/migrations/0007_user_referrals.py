from __future__ import annotations

import random
import string

from django.db import migrations, models


REFERRAL_ALPHABET = string.ascii_uppercase + string.digits


def _generate_code(existing_codes: set[str]) -> str:
    while True:
        code = "".join(random.choices(REFERRAL_ALPHABET, k=8))
        if code not in existing_codes:
            existing_codes.add(code)
            return code


def backfill_referral_codes(apps, schema_editor):
    User = apps.get_model("api", "User")
    existing_codes = set(
        User.objects.exclude(referral_code__isnull=True)
        .exclude(referral_code="")
        .values_list("referral_code", flat=True)
    )

    for user in User.objects.filter(models.Q(referral_code__isnull=True) | models.Q(referral_code="")).iterator():
        user.referral_code = _generate_code(existing_codes)
        user.save(update_fields=["referral_code"])


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0006_rename_background__status_32fd8e_idx_background__status_304870_idx"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="referral_code",
            field=models.CharField(blank=True, max_length=16, null=True, unique=True),
        ),
        migrations.AddField(
            model_name="user",
            name="referred_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="referred_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.SET_NULL,
                related_name="referred_users",
                to="api.user",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="referral_source",
            field=models.CharField(blank=True, default="", max_length=32),
        ),
        migrations.RunPython(backfill_referral_codes, migrations.RunPython.noop),
    ]
