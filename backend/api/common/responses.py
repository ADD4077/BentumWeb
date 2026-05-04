from django.http import JsonResponse


def success_response(*, message=None, http_status=200, **payload):
    body = {"success": True, **payload}
    if message is not None:
        body["message"] = message
    return JsonResponse(body, status=http_status)


def error_response(detail, *, http_status=400, **payload):
    body = {"success": False, "detail": detail, **payload}
    return JsonResponse(body, status=http_status)


def auth_required_response(detail="Требуется авторизация"):
    return error_response(detail, http_status=401)


def not_found_response(detail="Ресурс не найден"):
    return error_response(detail, http_status=404)


def permission_denied_response(detail="Недостаточно прав"):
    return error_response(detail, http_status=403)
