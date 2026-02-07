import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone

from .models import User


@csrf_exempt
def save_data(request):
    if request.method != "POST":
        return JsonResponse(
            {"detail": "Метод не разрешён"},
            status=405
        )

    try:
        data = json.loads(request.body)
        student_code = data.get("studentCode")
        red_code = data.get("studentRedCode")

        # 1. Валидация длины
        if not student_code or not red_code:
            return JsonResponse(
                {"detail": "Отсутствуют обязательные поля"},
                status=400
            )

        if len(student_code) != 10 or len(red_code) != 7:
            return JsonResponse(
                {"detail": "Некорректный формат кодов"},
                status=400
            )

        # 2. Проверка на существование
        if User.objects.filter(student_code=student_code).exists():
            return JsonResponse(
                {"detail": "Данный студенческий код уже зарегистрирован в системе"},
                status=400
            )

        # 3. Сохранение
        User.objects.create(
            student_code=student_code,
            red_code=red_code,
            created_at=timezone.now()
        )

        return JsonResponse(
            {"success": True, "message": "Данные успешно внесены"},
            status=200
        )

    except json.JSONDecodeError:
        return JsonResponse(
            {"detail": "Некорректный JSON"},
            status=400
        )

    except Exception as e:
        print(f"Ошибка БД: {e}")
        return JsonResponse(
            {"detail": "Ошибка при работе с базой данных"},
            status=500
        )
