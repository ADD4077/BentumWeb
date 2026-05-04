from django.core.management.base import BaseCommand

from api.background_jobs import BackgroundJobService


class Command(BaseCommand):
    help = "Process pending background jobs."

    def add_arguments(self, parser):
        parser.add_argument("--loop", action="store_true", help="Run continuously.")
        parser.add_argument("--sleep", type=int, default=5, help="Sleep duration between polls in loop mode.")
        parser.add_argument("--limit", type=int, default=20, help="Maximum number of jobs per batch.")

    def handle(self, *args, **options):
        loop = options["loop"]
        limit = options["limit"]
        sleep_seconds = options["sleep"]

        if loop:
            self.stdout.write(self.style.SUCCESS("Starting background job worker..."))
            BackgroundJobService.recover_stale_running_jobs(force_all=True)
            BackgroundJobService.run_forever(batch_size=limit, sleep_seconds=sleep_seconds)
            return

        processed = BackgroundJobService.process_pending(limit=limit)
        self.stdout.write(self.style.SUCCESS(f"Processed {processed} background jobs."))
