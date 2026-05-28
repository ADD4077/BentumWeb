import time

from django.core.management.base import BaseCommand
from django.db.utils import OperationalError, ProgrammingError

from api.background_jobs import BackgroundJobService


class Command(BaseCommand):
    help = "Process pending background jobs."

    def add_arguments(self, parser):
        parser.add_argument("--loop", action="store_true", help="Run continuously.")
        parser.add_argument("--sleep", type=int, default=5, help="Sleep duration between polls in loop mode.")
        parser.add_argument("--limit", type=int, default=20, help="Maximum number of jobs per batch.")

    @staticmethod
    def _background_jobs_table_not_ready(exc):
        message = str(exc).lower()
        return "background_jobs" in message and (
            "doesn't exist" in message
            or "does not exist" in message
            or "no such table" in message
        )

    def handle(self, *args, **options):
        loop = options["loop"]
        limit = options["limit"]
        sleep_seconds = options["sleep"]

        if loop:
            self.stdout.write(self.style.SUCCESS("Starting background job worker..."))
            while True:
                try:
                    BackgroundJobService.recover_stale_running_jobs(force_all=True)
                    BackgroundJobService.run_forever(batch_size=limit, sleep_seconds=sleep_seconds)
                    return
                except (ProgrammingError, OperationalError) as exc:
                    if not self._background_jobs_table_not_ready(exc):
                        raise

                    self.stdout.write(
                        self.style.WARNING(
                            "Background jobs table is not ready yet. Waiting for migrations to finish..."
                        )
                    )
                    time.sleep(sleep_seconds)
            return

        try:
            processed = BackgroundJobService.process_pending(limit=limit)
        except (ProgrammingError, OperationalError) as exc:
            if not self._background_jobs_table_not_ready(exc):
                raise
            processed = 0
        self.stdout.write(self.style.SUCCESS(f"Processed {processed} background jobs."))
