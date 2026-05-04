from django.core.management.base import BaseCommand

from api.ban_service import BanService


class Command(BaseCommand):
    help = "Deactivate expired active bans."

    def handle(self, *args, **options):
        cleaned = BanService.cleanup_expired_bans()
        self.stdout.write(self.style.SUCCESS(f"Cleaned up {cleaned} expired bans."))
