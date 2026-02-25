import json
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.contrib.sessions.models import Session
from django.contrib.sessions.backends.db import SessionStore
from django.conf import settings

from .models import User, UserSession
from .func import authorize


SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30


def _enforce_session_limits(student_code: str, current_session_key: str) -> None:
    if not student_code or not current_session_key:
        return

    UserSession.objects.get_or_create(
        session_key=current_session_key,
        defaults={"student_code": student_code},
    )

    sessions = list(
        UserSession.objects.filter(student_code=student_code).order_by('-created_at')
    )
    if len(sessions) <= 2:
        return

    for s in sessions[2:]:
        Session.objects.filter(session_key=s.session_key).delete()
        s.delete()


@csrf_exempt
def save_data(request):
    if request.method != "POST":
        return JsonResponse(
            {"detail": "Метод не разрешён"},
            status=405
        )


    try:
        # Правильно декодируем JSON из request.body
        if isinstance(request.body, bytes):
            body_str = request.body.decode('utf-8')
        else:
            body_str = request.body
        
        data = json.loads(body_str)
        print(f"Received data: {data}") # Debug print
        student_code = data.get("studentCode")
        red_code = data.get("studentRedCode") # Правильное имя поля
        print(f"Student Code: {student_code}, Red Code: {red_code}") # Debug print

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

        # Проверяем, существует ли пользователь в базе
        existing_user = User.objects.filter(student_code=student_code).first()
        if existing_user:
            # Если пользователь существует, выполняем вход и редирект в личный кабинет
            
            # Сохраняем сессию
            request.session['student_code'] = existing_user.student_code
            request.session['fullname'] = existing_user.fullname
            request.session['faculty'] = existing_user.faculty
            request.session['is_authenticated'] = True

            request.session.set_expiry(SESSION_MAX_AGE_SECONDS)
            
            # Явно сохраняем сессию
            request.session.save()

            _enforce_session_limits(existing_user.student_code, request.session.session_key)
            
            
            # Создаем ответ с cookie
            response_data = {
                "success": True,
                "message": "Вход выполнен успешно",
                "redirect": f"/api/dashboard?student_code={existing_user.student_code}",
                "user": {
                    "fullname": existing_user.fullname,
                    "faculty": existing_user.faculty,
                    "student_code": existing_user.student_code,
                    "created_at": existing_user.created_at.isoformat()
                }
            }
            
            response = HttpResponse(
                json.dumps(response_data),
                content_type='application/json',
                status=200
            )
            
            # Устанавливаем cookie явно
            response.set_cookie(
                'sessionid',
                request.session.session_key,
                max_age=SESSION_MAX_AGE_SECONDS,
                httponly=True,
                samesite='Lax',
                secure=False,
                path='/',
            )
            
            
            return response

        print(f"Calling authorize with student_code: {student_code}, red_code: {red_code}")
        auth_result = authorize(student_code, red_code)
        print(f"Authorize result: {auth_result}")
        
        if auth_result is False:
            return JsonResponse(
                {"detail": "Неверные данные авторизации"},
                status=401
            )
        
        # Если authorize вернул кортеж с данными
        fullname, faculty = auth_result
        print(f"Authorization successful. Fullname: {fullname}, Faculty: {faculty}")
        
        # Создаем нового пользователя
        user = User.objects.create(
            fullname=fullname,
            faculty=faculty,
            student_code=student_code,
            bilet_code=red_code,
            created_at=timezone.now()
        )
        print(f"User created: {user.student_code}")
                
        # Сохраняем сессию
        request.session['student_code'] = user.student_code
        request.session['fullname'] = user.fullname
        request.session['faculty'] = user.faculty
        request.session['is_authenticated'] = True

        request.session.set_expiry(SESSION_MAX_AGE_SECONDS)
        
        # Явно сохраняем сессию
        request.session.save()

        _enforce_session_limits(user.student_code, request.session.session_key)
        
        
        # Создаем ответ с cookie
        response_data = {
            "success": True,
            "message": "Регистрация прошла успешно",
            "redirect": f"/api/dashboard?student_code={user.student_code}",
            "user": {
                "fullname": user.fullname,
                "faculty": user.faculty,
                "student_code": user.student_code,
                "created_at": user.created_at.isoformat()
            }
        }
        
        response = HttpResponse(
            json.dumps(response_data),
            content_type='application/json',
            status=200
        )
        
        # Устанавливаем cookie явно
        response.set_cookie(
            'sessionid',
            request.session.session_key,
            max_age=SESSION_MAX_AGE_SECONDS,
            httponly=True,
            samesite='Lax',
            secure=False,
            path='/',
        )
        
        return response

    except json.JSONDecodeError:
        print("JSONDecodeError: Invalid JSON received")
        return JsonResponse(
            {"detail": "Некорректный JSON"},
            status=400
        )

    except Exception as e:
        print(f"An unexpected error occurred in save_data: {e}")
        return JsonResponse(
            {"detail": f"Ошибка сервера: {e}"},
            status=500
        )


@csrf_exempt
def dashboard(request):
    """
    Личный кабинет пользователя
    """
    if request.method != "GET":
        return JsonResponse(
            {"detail": "Метод не разрешён"},
            status=405
        )
    
    # Получаем student_code из query параметра (приоритет)
    student_code = request.GET.get('student_code')
    
    
    # Если student_code нет в query параметре, пробуем взять из сессии
    if not student_code:
        student_code = request.session.get('student_code')
    
    # Проверяем авторизацию через сессию
    if not request.session.get('is_authenticated') or not student_code:
        return JsonResponse(
            {"detail": "Пользователь не авторизован"},
            status=401
        )
    
    try:
        user = User.objects.get(student_code=student_code)
        
        # Дополнительная проверка безопасности: соответствие student_code сессии
        session_student_code = request.session.get('student_code')
        if session_student_code != student_code:
            return JsonResponse(
                {"detail": "Доступ запрещён"},
                status=403
            )
        
        return JsonResponse({
            "success": True,
            "theme": request.session.get('theme', 'dark'),
            "user": {
                "fullname": user.fullname,
                "faculty": user.faculty,
                "student_code": user.student_code,
                "created_at": user.created_at.isoformat()
            }
        }, status=200)
    
    except User.DoesNotExist:
        return JsonResponse(
            {"detail": "Пользователь не найден"},
            status=404
        )
    
    except Exception as e:
        return JsonResponse(
            {"detail": "Ошибка при работе с базой данных"},
            status=500
        )


@csrf_exempt
def logout(request):
    """
    Выход из системы - очистка сессии
    """
    try:
        session_key = request.session.session_key
        # Очищаем сессию
        request.session.flush()

        if session_key:
            UserSession.objects.filter(session_key=session_key).delete()
        return JsonResponse({
            "success": True,
            "message": "Выход выполнен успешно"
        }, status=200)
    
    except Exception as e:
        return JsonResponse({
            "success": False,
            "detail": "Ошибка при выходе из системы"
        }, status=500)


@csrf_exempt
def theme(request):
    if request.method == "GET":
        return JsonResponse({
            "success": True,
            "theme": request.session.get('theme', 'dark')
        }, status=200)

    if request.method != "POST":
        return JsonResponse(
            {"detail": "Метод не разрешён"},
            status=405
        )

    try:
        data = json.loads(request.body)
        selected_theme = data.get('theme')
        if selected_theme not in ("dark", "light"):
            return JsonResponse(
                {"detail": "Некорректная тема"},
                status=400
            )


        request.session['theme'] = selected_theme
        request.session.modified = True
        request.session.save()


        return JsonResponse({
            "success": True,
            "theme": selected_theme
        }, status=200)
    except json.JSONDecodeError:
        return JsonResponse(
            {"detail": "Некорректный JSON"},
            status=400
        )
