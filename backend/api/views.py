import json
import os
import re
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


@csrf_exempt
def get_schedule(request):
    """Получение расписания для группы пользователя"""
    if request.method != "GET":
        return JsonResponse(
            {"detail": "Метод не разрешён"},
            status=405
        )
    
    # Отладочная информация
    print(f"Session data: {dict(request.session)}")
    print(f"Is authenticated: {request.session.get('is_authenticated')}")
    print(f"Student code: {request.session.get('student_code')}")
    
    # Проверяем авторизацию
    if not request.session.get('is_authenticated'):
        return JsonResponse(
            {"detail": "Требуется авторизация"},
            status=401
        )
    
    student_code = request.session.get('student_code')
    if not student_code:
        return JsonResponse(
            {"detail": "Отсутствует код студента"},
            status=400
        )
    
    try:
        # Формируем имя файла расписания (используем первые 8 цифр)
        schedule_filename = f"schedule_{student_code[:8]}.json"
        schedule_path = os.path.join(settings.BASE_DIR, 'schedules', schedule_filename)
        
        print(f"Looking for schedule file: {schedule_filename}")
        print(f"Full path: {schedule_path}")
        print(f"File exists: {os.path.exists(schedule_path)}")
        
        # Проверяем существование файла
        if not os.path.exists(schedule_path):
            return JsonResponse(
                {"detail": f"Расписание для группы {student_code[:8]} не найдено"},
                status=404
            )
        
        # Читаем файл расписания
        with open(schedule_path, 'r', encoding='utf-8') as f:
            schedule_data = json.load(f)
        
        return JsonResponse({
            "success": True,
            "schedule": schedule_data,
            "student_code": student_code
        }, status=200)
        
    except json.JSONDecodeError:
        return JsonResponse(
            {"detail": "Ошибка чтения файла расписания"},
            status=500
        )
    except Exception as e:
        return JsonResponse(
            {"detail": f"Внутренняя ошибка сервера: {str(e)}"},
            status=500
        )


@csrf_exempt
def get_literature(request):
    """Возвращает список литературы с пагинацией и фильтрацией.

    Параметры GET:
      - page (int) - номер страницы, начиная с 1 (по умолчанию 1)
      - page_size (int) - элементов на страницу (по умолчанию 6)
      - search (str) - поисковая строка по title/author/description
      - category (str) - id категории (например, "mathematics"), "all" или отсутствие означает без фильтра
    """
    if request.method != "GET":
        return JsonResponse({"detail": "Метод не разрешён"}, status=405)

    def _format_size(size: any) -> any:
        """Нормализует строку размера: округляет число до 2 знаков и стандартизует единицу (B/KB/MB/GB).
        Если формат нераспознан — возвращает исходное значение.
        Примеры: '1.763Mb' -> '1.76MB', '1763Kb' -> '1763.00KB' (если в данных такое встречается).
        """
        if not size and size != 0:
            return None

        # Число в чистом виде
        if isinstance(size, (int, float)):
            try:
                return f"{float(size):.2f}"
            except Exception:
                return str(size)

        s = str(size).strip()
        # Автоисправление формата "1000.Kb" -> "1000KB"
        s = re.sub(r'([0-9]+)\.([kKmMgGtT]?)\s*([bB])', r'\1\2\3', s)
        # Пытаемся матчить число и опциональную единицу
        m = re.match(r"^\s*([0-9]+(?:[.,][0-9]+)?)\s*([kKmMgGtT]?\s*[bB])?\s*$", s)
        if not m:
            return s

        num = m.group(1).replace(',', '.')
        unit = (m.group(2) or '').replace(' ', '')
        unit = unit.upper() if unit else ''

        # Приводим единицу к общепринятому виду (KB/MB/GB/B)
        if unit in ('B', ''):
            unit = 'B' if unit == 'B' else ''
        elif unit in ('KB', 'K B'):
            unit = 'KB'
        elif unit in ('MB', 'M B'):
            unit = 'MB'
        elif unit in ('GB', 'G B'):
            unit = 'GB'

        try:
            val = float(num)
            # Округляем до 2 знаков
            formatted = f"{val:.2f}"
            return f"{formatted}{unit}"
        except Exception:
            return s

    def _parse_size(size_str: str) -> int:
        """Парсит строку размера и возвращает размер в байтах.
        Примеры: '1.76MB' -> 1843200, '1763KB' -> 1806336, '988KB' -> 1011712, '1000.Kb' -> 1024000
        """
        if not size_str:
            return 0
        
        s = str(size_str).strip()
        # Матчим число и единицу (включаем форматы типа "1000.Kb")
        m = re.match(r"^\s*([0-9]+(?:[.,][0-9]*)?)\s*([kKmMgGtT]?\s*[bB])?\s*$", s)
        if not m:
            return 0
        
        try:
            num = float(m.group(1).replace(',', '.'))
            unit = (m.group(2) or '').replace(' ', '').upper()
            
            # Конвертируем в байты
            multipliers = {
                'B': 1,
                'KB': 1024,
                'MB': 1024 * 1024,
                'GB': 1024 * 1024 * 1024,
                'TB': 1024 * 1024 * 1024 * 1024
            }
            
            multiplier = multipliers.get(unit, 1)
            return int(num * multiplier)
        except Exception:
            return 0

    try:
        page = int(request.GET.get('page', '1'))
        page_size = int(request.GET.get('page_size', '6'))
        if page < 1:
            page = 1
        if page_size < 1:
            page_size = 6
    except ValueError:
        return JsonResponse({"detail": "Некорректные параметры пагинации"}, status=400)

    search = (request.GET.get('search') or '').strip().lower()
    category = (request.GET.get('category') or '').strip()

    try:
        literature_path = os.path.join(settings.BASE_DIR, 'books', 'literature.json')
        if not os.path.exists(literature_path):
            return JsonResponse({"detail": "Файл литературы не найден"}, status=404)

        with open(literature_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Файл может быть либо списком элементов, либо словарём категорий с полем "items"
        flattened = []
        if isinstance(data, list):
            flattened = data
        elif isinstance(data, dict):
            # Преобразуем структуру { category: { items: [...] } }
            idx = 1
            for cat_key, cat_val in data.items():
                items = []
                if isinstance(cat_val, dict) and 'items' in cat_val and isinstance(cat_val['items'], list):
                    items = cat_val['items']
                elif isinstance(cat_val, list):
                    items = cat_val

                for it in items:
                    norm = {}
                    norm['id'] = it.get('id') or idx
                    norm['title'] = it.get('title') or it.get('name') or ''
                    # authors may be a list
                    authors = it.get('authors') or it.get('author') or ''
                    if isinstance(authors, list):
                        norm['author'] = ', '.join(authors)
                    else:
                        norm['author'] = authors
                    norm['description'] = it.get('description') or ''
                    norm['category'] = cat_key
                    norm['year'] = it.get('publishing_date') or it.get('year') or ''
                    # download link if present
                    download = it.get('download') or {}
                    norm['downloadUrl'] = download.get('download_link') or download.get('link') or it.get('download_link') or None
                    raw_size = download.get('size') or it.get('download', {}).get('size') or it.get('size') or None
                    norm['downloadSize'] = _format_size(raw_size)
                    norm['image_url'] = it.get('image_url') or None
                    norm['type'] = it.get('type') or None
                    flattened.append(norm)
                    idx += 1
        else:
            return JsonResponse({"detail": "Неподдерживаемый формат файла литературы"}, status=500)

        # Фильтрация
        def matches(item):
            # Поддержка множественных категорий
            categories = request.GET.getlist('category')
            if categories and 'all' not in categories:
                item_category = str(item.get('category'))
                if item_category not in categories:
                    return False
            if search:
                hay = ' '.join([str(item.get(k, '')).lower() for k in ('title', 'author', 'description')])
                if search not in hay:
                    return False
            return True

        filtered = [it for it in flattened if matches(it)]
        total = len(filtered)

        # Сортировка
        sort_param = request.GET.get('sort', 'default')
        if sort_param != 'default':
            if sort_param == 'title_asc':
                filtered.sort(key=lambda x: x.get('title', '').lower())
            elif sort_param == 'title_desc':
                filtered.sort(key=lambda x: x.get('title', '').lower(), reverse=True)
            elif sort_param == 'year_desc':
                filtered.sort(key=lambda x: x.get('year', ''), reverse=True)
            elif sort_param == 'year_asc':
                filtered.sort(key=lambda x: x.get('year', ''))
            elif sort_param == 'category_asc':
                filtered.sort(key=lambda x: x.get('category', '').lower())
            elif sort_param == 'category_desc':
                filtered.sort(key=lambda x: x.get('category', '').lower(), reverse=True)
            elif sort_param == 'size_desc':
                filtered.sort(key=lambda x: _parse_size(x.get('downloadSize', '')), reverse=True)
            elif sort_param == 'size_asc':
                filtered.sort(key=lambda x: _parse_size(x.get('downloadSize', '')))

        start = (page - 1) * page_size
        end = start + page_size
        page_items = filtered[start:end]

        return JsonResponse({
            "success": True,
            "page": page,
            "page_size": page_size,
            "total": total,
            "items": page_items,
        }, status=200, json_dumps_params={'ensure_ascii': False})

    except json.JSONDecodeError:
        return JsonResponse({"detail": "Ошибка чтения файла литературы"}, status=500)
    except Exception as e:
        return JsonResponse({"detail": f"Внутренняя ошибка сервера: {str(e)}"}, status=500)
