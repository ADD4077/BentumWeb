from datetime import timedelta

from django.utils import timezone

from .models import User, UserBan


class BanService:
    """Service for user ban lifecycle and ban status lookups."""

    FOREVER_DURATION_SECONDS = -1

    @staticmethod
    def ban_user(student_code, banned_by_id, duration_seconds, reason):
        try:
            user = User.objects.get(student_code=student_code)

            from .models import Administration

            if Administration.objects.filter(administrator=user, is_active=True).exists():
                return {
                    "success": False,
                    "detail": "Нельзя забанить администратора",
                }

            UserBan.objects.filter(student_code=student_code, is_active=True).update(is_active=False)

            ban = UserBan.objects.create(
                student_code=student_code,
                user_id=user.id,
                banned_by_id=banned_by_id,
                ban_duration_seconds=duration_seconds,
                ban_reason=reason,
                is_active=True,
            )

            if duration_seconds == BanService.FOREVER_DURATION_SECONDS:
                ban_end_date = None
            else:
                ban_end_date = ban.ban_date + timedelta(seconds=duration_seconds)
            return {
                "success": True,
                "ban_id": ban.id,
                "ban_end_date": ban_end_date.isoformat() if ban_end_date else None,
                "ban_duration_seconds": duration_seconds,
                "ban_reason": reason,
            }
        except User.DoesNotExist:
            return {
                "success": False,
                "detail": "Пользователь не найден",
            }
        except Exception as exc:
            return {
                "success": False,
                "detail": f"Ошибка при блокировке: {exc}",
            }

    @staticmethod
    def unban_user(student_code, unbanned_by_id, reason=""):
        del unbanned_by_id, reason
        try:
            User.objects.get(student_code=student_code)

            active_bans = UserBan.objects.filter(student_code=student_code, is_active=True)
            if not active_bans.exists():
                return {
                    "success": False,
                    "detail": "Пользователь не забанен",
                }

            active_bans.update(is_active=False)
            return {
                "success": True,
                "message": "Пользователь разблокирован",
            }
        except User.DoesNotExist:
            return {
                "success": False,
                "detail": "Пользователь не найден",
            }
        except Exception as exc:
            return {
                "success": False,
                "detail": f"Ошибка при разблокировке: {exc}",
            }

    @staticmethod
    def _default_status():
        return {
            "is_banned": False,
            "ban_info": None,
        }

    @staticmethod
    def _build_ban_status(ban, current_time):
        if ban.ban_duration_seconds == BanService.FOREVER_DURATION_SECONDS:
            return {
                "is_banned": True,
                "ban_info": {
                    "ban_id": ban.id,
                    "student_code": ban.student_code,
                    "user_id": ban.user_id,
                    "banned_by_id": ban.banned_by_id,
                    "ban_date": ban.ban_date.isoformat(),
                    "ban_end_date": None,
                    "ban_duration_seconds": ban.ban_duration_seconds,
                    "remaining_seconds": None,
                    "ban_reason": ban.ban_reason,
                },
            }

        ban_end_time = ban.ban_date + timedelta(seconds=ban.ban_duration_seconds)
        if current_time >= ban_end_time:
            return BanService._default_status()

        remaining_seconds = int((ban_end_time - current_time).total_seconds())
        return {
            "is_banned": True,
            "ban_info": {
                "ban_id": ban.id,
                "student_code": ban.student_code,
                "user_id": ban.user_id,
                "banned_by_id": ban.banned_by_id,
                "ban_date": ban.ban_date.isoformat(),
                "ban_end_date": ban_end_time.isoformat(),
                "ban_duration_seconds": ban.ban_duration_seconds,
                "remaining_seconds": remaining_seconds,
                "ban_reason": ban.ban_reason,
            },
        }

    @staticmethod
    def get_ban_statuses(student_codes):
        """
        Fetch ban statuses in bulk without mutating the database during read paths.
        """
        unique_codes = [code for code in dict.fromkeys(student_codes) if code]
        statuses = {code: BanService._default_status() for code in unique_codes}
        if not unique_codes:
            return statuses

        current_time = timezone.now()
        active_bans = UserBan.objects.filter(
            student_code__in=unique_codes,
            is_active=True,
        ).order_by("student_code", "-ban_date")

        latest_bans = {}
        for ban in active_bans:
            latest_bans.setdefault(ban.student_code, ban)

        for student_code, ban in latest_bans.items():
            statuses[student_code] = BanService._build_ban_status(ban, current_time)

        return statuses

    @staticmethod
    def check_ban_status(student_code):
        try:
            return BanService.get_ban_statuses([student_code]).get(
                student_code,
                BanService._default_status(),
            )
        except Exception as exc:
            return {
                "is_banned": False,
                "error": str(exc),
            }

    @staticmethod
    def cleanup_expired_bans():
        """
        Deactivate expired active bans outside the regular read path.
        Suitable for cron or a management command.
        """
        current_time = timezone.now()
        expired_ids = []

        for ban in UserBan.objects.filter(is_active=True).only(
            "id",
            "ban_date",
            "ban_duration_seconds",
        ):
            if ban.ban_duration_seconds == BanService.FOREVER_DURATION_SECONDS:
                continue
            ban_end_time = ban.ban_date + timedelta(seconds=ban.ban_duration_seconds)
            if current_time >= ban_end_time:
                expired_ids.append(ban.id)

        if not expired_ids:
            return 0

        return UserBan.objects.filter(id__in=expired_ids).update(is_active=False)

    @staticmethod
    def get_all_bans(include_inactive=False):
        queryset = UserBan.objects.all()
        if not include_inactive:
            queryset = queryset.filter(is_active=True)

        current_time = timezone.now()
        bans = []
        for ban in queryset.order_by("-created_at"):
            if ban.ban_duration_seconds == BanService.FOREVER_DURATION_SECONDS:
                ban_end_date = None
                is_currently_active = ban.is_active
            else:
                ban_end_date = ban.ban_date + timedelta(seconds=ban.ban_duration_seconds)
                is_currently_active = ban.is_active and current_time < ban_end_date
            bans.append(
                {
                    "id": ban.id,
                    "student_code": ban.student_code,
                    "user_id": ban.user_id,
                    "banned_by_id": ban.banned_by_id,
                    "ban_date": ban.ban_date.isoformat(),
                    "ban_end_date": ban_end_date.isoformat() if ban_end_date else None,
                    "ban_duration_seconds": ban.ban_duration_seconds,
                    "ban_reason": ban.ban_reason,
                    "is_active": ban.is_active,
                    "is_currently_active": is_currently_active,
                    "created_at": ban.created_at.isoformat(),
                }
            )

        return bans

    @staticmethod
    def get_ban_statistics():
        total_bans = UserBan.objects.count()
        active_bans = UserBan.objects.filter(is_active=True)
        active_ban_count = active_bans.count()

        current_time = timezone.now()
        currently_active = 0
        for ban in active_bans.only("ban_date", "ban_duration_seconds"):
            if ban.ban_duration_seconds == BanService.FOREVER_DURATION_SECONDS:
                currently_active += 1
                continue

            ban_end_time = ban.ban_date + timedelta(seconds=ban.ban_duration_seconds)
            if current_time < ban_end_time:
                currently_active += 1

        return {
            "total_bans": total_bans,
            "active_bans": active_ban_count,
            "currently_active": currently_active,
            "expired_bans": active_ban_count - currently_active,
        }
