from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .auth_sync import sync_administration_auth_flags
from .models import Administration


@receiver(post_save, sender=Administration)
def sync_admin_flags_on_save(sender, instance, **kwargs):
    sync_administration_auth_flags(instance.administrator)


@receiver(post_delete, sender=Administration)
def sync_admin_flags_on_delete(sender, instance, **kwargs):
    sync_administration_auth_flags(instance.administrator)
