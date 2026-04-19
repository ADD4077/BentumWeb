import json
import logging
import re
import time
from datetime import datetime

from django.contrib.auth.hashers import make_password
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view

from .ban_service import BanService
from .common.decorators import allow_unverified_2fa
from .common.utils import get_user_full_data
from .media_service import MediaStorage
from .models import Administration, User, UserProfileMedia

logger = logging.getLogger(__name__)


def get_unix_timestamp():
    return int(datetime.now().timestamp())


def _serialize_admin_user(user_row, ban_statuses, admin_ids, active_avatars):
    ban_status = ban_statuses.get(user_row["student_code"], {"is_banned": False})
    return {
        **user_row,
        "status": "banned" if ban_status["is_banned"] else "active",
        "is_admin": user_row["id"] in admin_ids,
        "avatar_url": active_avatars.get(user_row["id"]),
    }


def _get_session_user(request):
    if not request.session.get("is_authenticated"):
        return None, JsonResponse({"detail": "Требуется авторизация"}, status=401)

    student_code = request.session.get("student_code")
    user = User.objects.filter(student_code=student_code).first()
    if not user:
        return None, JsonResponse({"detail": "Пользователь не найден"}, status=404)

    return user, None


def _get_session_user_payload(request):
    if not request.session.get("is_authenticated"):
        return None, "Authorization required", 401

    student_code = request.session.get("student_code")
    user = User.objects.filter(student_code=student_code).first()
    if not user:
        return None, "User not found", 404

    return user, None, None


def _require_admin_user(request):
    user, error_response = _get_session_user(request)
    if error_response:
        return None, error_response

    if not Administration.objects.filter(administrator=user, is_active=True).exists():
        return None, JsonResponse({"detail": "Доступ запрещен"}, status=403)

    return user, None


def _request_data(request):
    return request.data if isinstance(request.data, dict) else {}


@api_view(["GET"])
def get_all_users(request):
    """Получить список всех пользователей."""
    try:
        _, error_response = _require_admin_user(request)
        if error_response:
            return error_response

        users_list = list(
            User.objects.all().values(
                "id",
                "fullname",
                "student_code",
                "faculty",
                "created_at",
                "last_login",
            )
        )

        active_avatars = {
            media.user_id: MediaStorage.get_media_url(media, "medium")
            for media in UserProfileMedia.objects.filter(
                user_id__in=[user["id"] for user in users_list],
                media_type="avatar",
                is_active=True,
            ).select_related("user")
        }

        student_codes = [user["student_code"] for user in users_list]
        ban_statuses = BanService.get_ban_statuses(student_codes)
        admin_ids = set(
            Administration.objects.filter(is_active=True).values_list("administrator_id", flat=True)
        )

        users_list = [
            _serialize_admin_user(user, ban_statuses, admin_ids, active_avatars)
            for user in users_list
        ]

        return JsonResponse({"success": True, "users": users_list})
    except Exception:
        logger.exception("Failed to fetch users list")
        return JsonResponse({"success": False, "detail": "Внутренняя ошибка сервера"}, status=500)


@api_view(["GET"])
def get_users_stats(request):
    """Получить статистику пользователей."""
    try:
        _, error_response = _require_admin_user(request)
        if error_response:
            return error_response

        total_users = User.objects.count()
        student_codes = list(User.objects.values_list("student_code", flat=True))
        ban_statuses = BanService.get_ban_statuses(student_codes)

        banned_count = sum(1 for status in ban_statuses.values() if status["is_banned"])
        active_count = total_users - banned_count

        today_timestamp = int(time.time())
        today_start = today_timestamp - (today_timestamp % 86400)
        new_users_today = User.objects.filter(created_at__gte=today_start).count()

        return JsonResponse(
            {
                "success": True,
                "stats": {
                    "totalUsers": total_users,
                    "bannedUsers": banned_count,
                    "activeUsers": active_count,
                    "newUsersToday": new_users_today,
                },
            }
        )
    except Exception:
        logger.exception("Failed to fetch users stats")
        return JsonResponse({"success": False, "detail": "Внутренняя ошибка сервера"}, status=500)


@api_view(["POST"])
def create_user(request):
    """Создать нового пользователя."""
    try:
        _, error_response = _require_admin_user(request)
        if error_response:
            return error_response

        data = _request_data(request)
        if not data:
            return JsonResponse({"success": False, "detail": "Неверный формат данных"}, status=400)

        required_fields = ["fullname", "student_code", "faculty", "password"]
        for field in required_fields:
            if not data.get(field):
                return JsonResponse(
                    {"success": False, "detail": f"Поле {field} обязательно"},
                    status=400,
                )

        if not re.match(r"^\d{10}$", data["student_code"]):
            return JsonResponse(
                {"success": False, "detail": "Код студента должен состоять из 10 цифр"},
                status=400,
            )

        if len(data["password"]) < 7:
            return JsonResponse(
                {"success": False, "detail": "Пароль должен содержать минимум 7 символов"},
                status=400,
            )

        if User.objects.filter(student_code=data["student_code"]).exists():
            return JsonResponse(
                {
                    "success": False,
                    "detail": "Пользователь с таким кодом студента уже существует",
                },
                status=400,
            )

        User.objects.create(
            fullname=data["fullname"],
            student_code=data["student_code"],
            faculty=data["faculty"],
            password=make_password(data["password"]),
            created_at=get_unix_timestamp(),
        )

        return JsonResponse(
            {
                "success": True,
                "message": f'Пользователь {data["fullname"]} успешно создан',
            }
        )
    except Exception:
        logger.exception("Failed to create user")
        return JsonResponse({"success": False, "detail": "Внутренняя ошибка сервера"}, status=500)


@api_view(["POST"])
def ban_user(request):
    """Забанить пользователя."""
    try:
        current_user, error_response = _require_admin_user(request)
        if error_response:
            return error_response

        data = _request_data(request)
        if not data:
            return JsonResponse({"success": False, "detail": "Неверный формат данных"}, status=400)

        user_id = data.get("user_id")
        reason = data.get("reason", "Причина не указана")
        duration_days = data.get("duration", 7)
        duration_seconds = data.get("duration_seconds")

        if not user_id:
            return JsonResponse({"success": False, "detail": "ID пользователя обязателен"}, status=400)

        try:
            user_to_ban = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return JsonResponse({"success": False, "detail": "Пользователь не найден"}, status=404)

        if Administration.objects.filter(administrator=user_to_ban, is_active=True).exists():
            return JsonResponse(
                {"success": False, "detail": "Нельзя заблокировать администратора"},
                status=403,
            )

        if duration_seconds is not None:
            try:
                duration_seconds = int(duration_seconds)
            except (TypeError, ValueError):
                return JsonResponse(
                    {"success": False, "detail": "РќРµРєРѕСЂСЂРµРєС‚РЅР°СЏ РґР»РёС‚РµР»СЊРЅРѕСЃС‚СЊ Р±Р»РѕРєРёСЂРѕРІРєРё"},
                    status=400,
                )
        else:
            try:
                duration_days = int(duration_days)
            except (TypeError, ValueError):
                return JsonResponse(
                    {"success": False, "detail": "РќРµРєРѕСЂСЂРµРєС‚РЅР°СЏ РґР»РёС‚РµР»СЊРЅРѕСЃС‚СЊ Р±Р»РѕРєРёСЂРѕРІРєРё"},
                    status=400,
                )
            duration_seconds = (
                BanService.FOREVER_DURATION_SECONDS
                if duration_days == -1
                else duration_days * 24 * 60 * 60
            )

        if duration_seconds == 0 or duration_seconds < BanService.FOREVER_DURATION_SECONDS:
            return JsonResponse(
                {"success": False, "detail": "РќРµРєРѕСЂСЂРµРєС‚РЅР°СЏ РґР»РёС‚РµР»СЊРЅРѕСЃС‚СЊ Р±Р»РѕРєРёСЂРѕРІРєРё"},
                status=400,
            )
        result = BanService.ban_user(
            student_code=user_to_ban.student_code,
            banned_by_id=current_user.id,
            duration_seconds=duration_seconds,
            reason=reason,
        )

        if result["success"]:
            return JsonResponse(
                {
                    "success": True,
                    "message": f"Пользователь {user_to_ban.fullname} заблокирован",
                    "ban_end_date": result.get("ban_end_date"),
                    "ban_duration_seconds": result.get("ban_duration_seconds"),
                    "ban_reason": result.get("ban_reason"),
                }
            )

        return JsonResponse({"success": False, "detail": result["detail"]}, status=400)
    except Exception:
        logger.exception("Failed to ban user")
        return JsonResponse({"success": False, "detail": "Внутренняя ошибка сервера"}, status=500)


@api_view(["POST"])
def unban_user(request):
    """Разбанить пользователя."""
    try:
        current_user, error_response = _require_admin_user(request)
        if error_response:
            return error_response

        data = _request_data(request)
        if not data:
            return JsonResponse({"success": False, "detail": "Неверный формат данных"}, status=400)

        user_id = data.get("user_id")
        if not user_id:
            return JsonResponse({"success": False, "detail": "ID пользователя обязателен"}, status=400)

        try:
            user_to_unban = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return JsonResponse({"success": False, "detail": "Пользователь не найден"}, status=404)

        result = BanService.unban_user(
            student_code=user_to_unban.student_code,
            unbanned_by_id=current_user.id,
        )

        if result["success"]:
            return JsonResponse(
                {
                    "success": True,
                    "message": f"Пользователь {user_to_unban.fullname} разблокирован",
                }
            )

        return JsonResponse({"success": False, "detail": result["detail"]}, status=400)
    except Exception:
        logger.exception("Failed to unban user")
        return JsonResponse({"success": False, "detail": "Внутренняя ошибка сервера"}, status=500)


@allow_unverified_2fa
@csrf_exempt
@api_view(["GET"])
def get_user_by_code(request, student_code):
    """Получить информацию о пользователе по студенческому коду."""
    try:
        user = User.objects.filter(student_code=student_code).first()

        if not user:
            request.session.modified = False
            return JsonResponse({"success": True, "user": None})

        user_data = get_user_full_data(user)
        user_data["status"] = "banned" if user_data["is_banned"] else "active"
        request.session.modified = False

        return JsonResponse({"success": True, "user": user_data})
    except Exception:
        request.session.modified = False
        logger.exception("Failed to fetch user by code")
        return JsonResponse({"success": False, "detail": "Внутренняя ошибка сервера"}, status=500)


@allow_unverified_2fa
@csrf_exempt
@api_view(["GET"])
def get_public_stats(request):
    """Публичный endpoint для получения статистики."""
    if request.method != "GET":
        return JsonResponse({"detail": "Метод не разрешен"}, status=405)

    try:
        total_users = User.objects.count()
        unique_faculties = User.objects.values_list("faculty", flat=True).distinct()
        faculties_count = len([faculty for faculty in unique_faculties if faculty])

        student_codes = list(User.objects.values_list("student_code", flat=True))
        ban_statuses = BanService.get_ban_statuses(student_codes)
        banned_count = sum(1 for status in ban_statuses.values() if status["is_banned"])

        return JsonResponse(
            {
                "success": True,
                "stats": {
                    "totalUsers": total_users,
                    "facultiesCount": faculties_count,
                    "bannedUsers": banned_count,
                    "activeUsers": total_users - banned_count,
                    "uptime": "99.9%",
                },
            }
        )
    except Exception:
        logger.exception("Failed to fetch public stats")
        return JsonResponse(
            {"success": False, "detail": "Ошибка загрузки статистики"},
            status=500,
        )


@csrf_exempt
def email_binding_status(request):
    """Получить статус привязки email для текущего пользователя."""
    try:
        if request.method != "GET":
            return JsonResponse({"success": False, "detail": "Method not allowed"}, status=405)

        user, error_detail, status_code = _get_session_user_payload(request)
        if error_detail:
            return JsonResponse({"success": False, "detail": error_detail}, status=status_code)

        if user.email:
            return JsonResponse(
                {
                    "success": True,
                    "data": {
                        "is_linked": True,
                        "email": user.email,
                    },
                }
            )

        return JsonResponse(
            {
                "success": True,
                "data": {
                    "is_linked": False,
                    "email": None,
                },
            }
        )
    except Exception:
        logger.exception("Error getting email binding status")
        return JsonResponse({"success": False, "detail": "Error checking email binding status"}, status=500)


@csrf_exempt
def email_bind(request):
    """Привязать email к аккаунту пользователя."""
    try:
        if request.method != "POST":
            return JsonResponse({"success": False, "detail": "Method not allowed"}, status=405)

        user, error_detail, status_code = _get_session_user_payload(request)
        if error_detail:
            return JsonResponse({"success": False, "detail": error_detail}, status=status_code)

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"success": False, "detail": "Invalid JSON"}, status=400)

        email = data.get("email", "").strip()
        if not email or "@" not in email:
            return JsonResponse({"success": False, "detail": "Invalid email address"}, status=400)

        existing_user = User.objects.filter(email=email).exclude(id=user.id).first()
        if existing_user:
            return JsonResponse(
                {"success": False, "detail": "Email already used by another account"},
                status=400,
            )

        user.email = email
        user.save(update_fields=["email"])

        logger.info("Email %s bound to user %s", email, user.student_code)

        return JsonResponse(
            {
                "success": True,
                "message": "Email successfully bound",
                "data": {
                    "is_linked": True,
                    "email": email,
                },
            }
        )
    except Exception:
        logger.exception("Error binding email")
        return JsonResponse({"success": False, "detail": "Error binding email"}, status=500)
