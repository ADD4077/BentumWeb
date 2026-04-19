import logging
import time
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from .ban_service import BanService
from .models import BackgroundJob
from .telegram_binding_service import TelegramBindingService
from .telegram_service import TelegramService
from .user_notification_service import UserNotificationService

logger = logging.getLogger(__name__)


class BackgroundJobType:
    SUPPORT_REQUEST_NOTIFICATION = "support_request_notification"
    NEW_USER_NOTIFICATION = "new_user_notification"
    CLEANUP_EXPIRED_BANS = "cleanup_expired_bans"
    CLEANUP_TELEGRAM_TOKENS = "cleanup_telegram_tokens"


class BackgroundJobService:
    DEFAULT_MAX_ATTEMPTS = 3
    MAINTENANCE_INTERVAL_SECONDS = 300

    @staticmethod
    def enqueue(job_type, payload=None, *, max_attempts=None, available_at=None):
        return BackgroundJob.objects.create(
            job_type=job_type,
            payload=payload or {},
            max_attempts=max_attempts or BackgroundJobService.DEFAULT_MAX_ATTEMPTS,
            available_at=available_at or timezone.now(),
        )

    @staticmethod
    def _reserve_job():
        with transaction.atomic():
            job = (
                BackgroundJob.objects.select_for_update(skip_locked=True)
                .filter(
                    status=BackgroundJob.STATUS_PENDING,
                    available_at__lte=timezone.now(),
                )
                .order_by("created_at")
                .first()
            )
            if not job:
                return None

            job.status = BackgroundJob.STATUS_RUNNING
            job.started_at = timezone.now()
            job.attempts += 1
            job.save(update_fields=["status", "started_at", "attempts", "updated_at"])
            return job

    @staticmethod
    def _mark_completed(job):
        job.status = BackgroundJob.STATUS_COMPLETED
        job.finished_at = timezone.now()
        job.last_error = ""
        job.save(update_fields=["status", "finished_at", "last_error", "updated_at"])

    @staticmethod
    def _mark_failed(job, exc):
        retry_at = timezone.now() + timedelta(seconds=min(300, 10 * job.attempts))
        job.last_error = str(exc)
        job.finished_at = timezone.now()
        if job.attempts >= job.max_attempts:
            job.status = BackgroundJob.STATUS_FAILED
            job.available_at = retry_at
        else:
            job.status = BackgroundJob.STATUS_PENDING
            job.available_at = retry_at
        job.save(
            update_fields=[
                "status",
                "available_at",
                "finished_at",
                "last_error",
                "updated_at",
            ]
        )

    @staticmethod
    def _dispatch(job):
        payload = job.payload or {}

        if job.job_type == BackgroundJobType.SUPPORT_REQUEST_NOTIFICATION:
            telegram_service = TelegramService()
            ok = telegram_service.send_support_request_sync(
                payload["user_data"],
                payload["message"],
                payload.get("request_type", "support"),
            )
            if not ok:
                raise RuntimeError("Failed to deliver support request notification")
            return

        if job.job_type == BackgroundJobType.NEW_USER_NOTIFICATION:
            notification_service = UserNotificationService()
            ok = notification_service.send_new_user_notification(payload["user_data"])
            if not ok:
                raise RuntimeError("Failed to deliver new user notification")
            return

        if job.job_type == BackgroundJobType.CLEANUP_EXPIRED_BANS:
            BanService.cleanup_expired_bans()
            return

        if job.job_type == BackgroundJobType.CLEANUP_TELEGRAM_TOKENS:
            TelegramBindingService().cleanup_expired_tokens()
            return

        raise ValueError(f"Unsupported background job type: {job.job_type}")

    @staticmethod
    def process_pending(limit=20):
        processed = 0
        while processed < limit:
            job = BackgroundJobService._reserve_job()
            if not job:
                break

            try:
                BackgroundJobService._dispatch(job)
            except Exception as exc:
                logger.exception("Background job %s failed", job.id)
                BackgroundJobService._mark_failed(job, exc)
            else:
                BackgroundJobService._mark_completed(job)
            processed += 1

        return processed

    @staticmethod
    def schedule_maintenance_jobs():
        now = timezone.now()
        threshold = now - timedelta(seconds=BackgroundJobService.MAINTENANCE_INTERVAL_SECONDS)

        maintenance_job_types = (
            BackgroundJobType.CLEANUP_EXPIRED_BANS,
            BackgroundJobType.CLEANUP_TELEGRAM_TOKENS,
        )

        for job_type in maintenance_job_types:
            exists = BackgroundJob.objects.filter(
                job_type=job_type,
                status__in=[BackgroundJob.STATUS_PENDING, BackgroundJob.STATUS_RUNNING],
            ).exists()
            recently_completed = BackgroundJob.objects.filter(
                job_type=job_type,
                status=BackgroundJob.STATUS_COMPLETED,
                finished_at__gte=threshold,
            ).exists()

            if not exists and not recently_completed:
                BackgroundJobService.enqueue(job_type, {})

    @staticmethod
    def run_forever(batch_size=20, sleep_seconds=5):
        while True:
            BackgroundJobService.schedule_maintenance_jobs()
            processed = BackgroundJobService.process_pending(limit=batch_size)
            if processed == 0:
                time.sleep(sleep_seconds)
