import json

from django.contrib.auth.hashers import check_password, make_password
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from ..common.utils import get_current_user, get_user_media


@require_http_methods(["POST", "GET"])
def update_profile(request):
    try:
        if not request.session.get('is_authenticated'):
            return JsonResponse({"success": False, "detail": "Требуется авторизация"}, status=401)

        user = get_current_user(request)
        if not user:
            return JsonResponse({"success": False, "detail": "Пользователь не найден"}, status=404)

        media = get_user_media(user)
        user_payload = {
            "fullname": user.fullname,
            "faculty": user.faculty,
            "student_code": user.student_code,
            "created_at": user.created_at,
            **media,
        }

        if request.method == "GET":
            return JsonResponse({"success": True, "user": user_payload})

        return JsonResponse({
            "success": True,
            "message": "Медиа успешно обновлено",
            "user": user_payload,
        })
    except Exception as exc:
        return JsonResponse({"success": False, "detail": f"Ошибка сервера: {exc}"}, status=500)


@require_http_methods(["POST"])
def update_avatar(request):
    try:
        if not request.session.get('is_authenticated'):
            return JsonResponse({"success": False, "detail": "Требуется авторизация"}, status=401)

        user = get_current_user(request)
        if not user:
            return JsonResponse({"success": False, "detail": "Пользователь не найден"}, status=404)

        from ..media_service import MediaStorage

        return JsonResponse({
            "success": True,
            "message": "Аватар успешно обновлен",
            "avatar_url": None,
            "avatar_placeholder": MediaStorage.get_placeholder_data(user, 'avatar'),
        })
    except Exception as exc:
        return JsonResponse({"success": False, "detail": f"Ошибка сервера: {exc}"}, status=500)


@require_http_methods(["POST"])
def update_banner(request):
    try:
        if not request.session.get('is_authenticated'):
            return JsonResponse({"success": False, "detail": "Требуется авторизация"}, status=401)

        user = get_current_user(request)
        if not user:
            return JsonResponse({"success": False, "detail": "Пользователь не найден"}, status=404)

        from ..media_service import MediaStorage

        return JsonResponse({
            "success": True,
            "message": "Баннер успешно обновлен",
            "banner_url": None,
            "banner_placeholder": MediaStorage.get_placeholder_data(user, 'banner'),
        })
    except Exception as exc:
        return JsonResponse({"success": False, "detail": f"Ошибка сервера: {exc}"}, status=500)


@require_http_methods(["POST"])
def change_password(request):
    try:
        if not request.session.get('is_authenticated'):
            return JsonResponse({"success": False, "detail": "Требуется авторизация"}, status=401)

        user = get_current_user(request)
        if not user:
            return JsonResponse({"success": False, "detail": "Пользователь не найден"}, status=404)

        data = json.loads(request.body)
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        confirm_password = data.get('confirm_password')

        if not current_password or not new_password or not confirm_password:
            return JsonResponse({"success": False, "detail": "Все поля обязательны для заполнения"}, status=400)

        if new_password != confirm_password:
            return JsonResponse({"success": False, "detail": "Новые пароли не совпадают"}, status=400)

        if len(new_password) < 7:
            return JsonResponse({"success": False, "detail": "Пароль должен содержать минимум 7 символов"}, status=400)

        if not check_password(current_password, user.password):
            return JsonResponse({"success": False, "detail": "Текущий пароль указан неверно"}, status=400)

        user.password = make_password(new_password)
        user.save(update_fields=['password'])

        return JsonResponse({"success": True, "message": "Пароль успешно изменен"})
    except json.JSONDecodeError:
        return JsonResponse({"success": False, "detail": "Неверный формат данных"}, status=400)
    except Exception as exc:
        return JsonResponse({"success": False, "detail": f"Ошибка сервера: {exc}"}, status=500)
