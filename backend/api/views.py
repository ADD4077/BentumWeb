import json
import os
import re
import sqlite3
from datetime import datetime
from django.conf import settings
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from .func import authorize
import pytz
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
            created_at=datetime.now(pytz.UTC)
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
        # Путь к базе данных
        db_path = os.path.join(settings.BASE_DIR, 'schedules', 'schedules.db')
        
        print(f"Looking for schedule database: {db_path}")
        print(f"Database exists: {os.path.exists(db_path)}")
        
        # Проверяем существование базы данных
        if not os.path.exists(db_path):
            return JsonResponse(
                {"detail": "База данных расписаний не найдена"},
                status=404
            )
        
        # Подключаемся к базе данных
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Ищем расписание для группы (первые 8 цифр student_code)
        group_id = student_code[:8]
        
        # Получаем расписание из базы данных
        cursor.execute("""
            SELECT day, week, time, matter, frame, teacher, classroom 
            FROM schedules 
            WHERE group_number = ? 
            ORDER BY day, week, time
        """, (group_id,))
        
        rows = cursor.fetchall()
        conn.close()
        
        if not rows:
            return JsonResponse(
                {"detail": f"Расписание для группы {group_id} не найдено"},
                status=404
            )
        
        # Формируем данные в том же формате, что и JSON
        schedule_data = {}
        
        for row in rows:
            day, week, time, matter, frame, teacher, classroom = row
            
            # Создаем структуру дня и недели если нужно
            if day not in schedule_data:
                schedule_data[day] = {}
            week_type = 'upper' if week == 1 else 'lower'
            if week_type not in schedule_data[day]:
                schedule_data[day][week_type] = []
            
            # Добавляем занятие
            schedule_data[day][week_type].append({
                "time": time,
                "subject": matter,
                "type": frame,
                "teacher": teacher,
                "classroom": classroom
            })
        
        return JsonResponse({
            "success": True,
            "schedule": schedule_data,
            "student_code": student_code
        }, status=200)
        
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return JsonResponse(
            {"detail": "Ошибка базы данных расписаний"},
            status=500
        )
    except Exception as e:
        print(f"Unexpected error: {e}")
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
        # Путь к базе данных
        db_path = os.path.join(settings.BASE_DIR, 'books', 'literature.db')
        
        if not os.path.exists(db_path):
            return JsonResponse({"detail": "База данных литературы не найдена"}, status=404)

        # Подключаемся к базе данных
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Формируем SQL запрос с фильтрацией
        where_conditions = []
        params = []

        # Фильтрация по категориям
        categories = request.GET.getlist('category')
        if categories and 'all' not in categories:
            placeholders = ','.join(['?' for _ in categories])
            where_conditions.append(f"category IN ({placeholders})")
            params.extend(categories)

        # Поисковый фильтр
        if search:
            where_conditions.append("(LOWER(title) LIKE ? OR LOWER(authors) LIKE ? OR LOWER(description) LIKE ?)")
            search_param = f"%{search}%"
            params.extend([search_param, search_param, search_param])

        # Формируем WHERE
        where_clause = ""
        if where_conditions:
            where_clause = "WHERE " + " AND ".join(where_conditions)

        # Сортировка
        order_clause = "ORDER BY title ASC"
        sort_param = request.GET.get('sort', 'default')
        if sort_param != 'default':
            if sort_param == 'title_asc':
                order_clause = "ORDER BY title ASC"
            elif sort_param == 'title_desc':
                order_clause = "ORDER BY title DESC"
            elif sort_param == 'year_desc':
                order_clause = "ORDER BY publishing_date DESC"
            elif sort_param == 'year_asc':
                order_clause = "ORDER BY publishing_date ASC"
            elif sort_param == 'category_asc':
                order_clause = "ORDER BY category ASC"
            elif sort_param == 'category_desc':
                order_clause = "ORDER BY category DESC"
            elif sort_param == 'size_desc':
                order_clause = "ORDER BY title ASC"  # Временная сортировка, будем сортировать в Python
            elif sort_param == 'size_asc':
                order_clause = "ORDER BY title ASC"  # Временная сортировка, будем сортировать в Python

        # Для сортировки по размеру получаем все данные, иначе - используем пагинацию в SQL
        if sort_param in ['size_desc', 'size_asc']:
            # Получаем все данные для сортировки по размеру
            query = f"""
                SELECT rowid, title, faculty, category, authors, publishing_date, 
                       description, image_url, download_size, download_link
                FROM literature 
                {where_clause}
            """
            cursor.execute(query, params)
            all_rows = cursor.fetchall()
            conn.close()
            
            # Формируем все данные
            all_items = []
            for row in all_rows:
                (rowid, title, faculty, category, authors, publishing_date, 
                 description, image_url, download_size, download_link) = row
                
                all_items.append({
                    'id': rowid,
                    'title': title or '',
                    'author': authors or '',
                    'description': description or '',
                    'category': category or '',
                    'year': publishing_date or '',
                    'faculty': faculty or '',
                    'downloadUrl': download_link,
                    'downloadSize': _format_size(download_size),
                    'downloadSizeRaw': download_size,
                    'image_url': image_url
                })
            
            # Сортировка по размеру
            reverse = sort_param == 'size_desc'
            all_items.sort(key=lambda x: _parse_size(x.get('downloadSizeRaw', '') or '0'), reverse=reverse)
            
            # Применяем пагинацию
            total = len(all_items)
            start = (page - 1) * page_size
            end = start + page_size
            items = all_items[start:end]
            
        else:
            # Обычная сортировка через SQL с пагинацией
            count_query = f"SELECT COUNT(*) FROM literature {where_clause}"
            cursor.execute(count_query, params)
            total = cursor.fetchone()[0]

            offset = (page - 1) * page_size
            limit_clause = f"LIMIT {page_size} OFFSET {offset}"

            query = f"""
                SELECT rowid, title, faculty, category, authors, publishing_date, 
                       description, image_url, download_size, download_link
                FROM literature 
                {where_clause} 
                {order_clause} 
                {limit_clause}
            """
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            conn.close()

            # Формируем данные
            items = []
            for row in rows:
                (rowid, title, faculty, category, authors, publishing_date, 
                 description, image_url, download_size, download_link) = row
                
                items.append({
                    'id': rowid,
                    'title': title or '',
                    'author': authors or '',
                    'description': description or '',
                    'category': category or '',
                    'year': publishing_date or '',
                    'faculty': faculty or '',
                    'downloadUrl': download_link,
                    'downloadSize': _format_size(download_size),
                    'image_url': image_url
                })

        return JsonResponse({
            "success": True,
            "page": page,
            "page_size": page_size,
            "total": total,
            "items": items,
        }, status=200, json_dumps_params={'ensure_ascii': False})

    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return JsonResponse({"detail": "Ошибка базы данных литературы"}, status=500)
    except Exception as e:
        print(f"Unexpected error: {e}")
        return JsonResponse({"detail": f"Внутренняя ошибка сервера: {str(e)}"}, status=500)


@csrf_exempt
def get_news(request):
    """Возвращает список новостей с пагинацией и фильтрацией.
    
    Параметры GET:
      - page (int) - номер страницы, начиная с 1 (по умолчанию 1)
      - page_size (int) - элементов на страницу (по умолчанию 6)
      - category (str) - фильтр по категории
      - search (str) - поисковая строка
    """
    if request.method != "GET":
        return JsonResponse({"detail": "Метод не разрешён"}, status=405)

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
    sort_by = (request.GET.get('sort_by') or 'date_desc').strip()

    try:
        # Путь к базе данных
        db_path = os.path.join(settings.BASE_DIR, 'news', 'times_news.db')
        
        if not os.path.exists(db_path):
            return JsonResponse({"detail": "База данных новостей не найдена"}, status=404)

        # Подключаемся к базе данных
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Формируем SQL запрос с фильтрацией
        where_conditions = []
        params = []

        # Фильтр по категории
        if category and category != 'all':
            where_conditions.append("tags LIKE ?")
            params.append(f"%{category}%")

        # Поисковый фильтр
        if search:
            where_conditions.append("(LOWER(title) LIKE ? OR LOWER(summary) LIKE ?)")
            search_param = f"%{search}%"
            params.extend([search_param, search_param])

        # Формируем WHERE
        where_clause = ""
        if where_conditions:
            where_clause = "WHERE " + " AND ".join(where_conditions)

        # Получаем общее количество
        count_query = f"SELECT COUNT(*) FROM news {where_clause}"
        cursor.execute(count_query, params)
        total = cursor.fetchone()[0]

        # Пагинация
        offset = (page - 1) * page_size
        limit_clause = f"LIMIT {page_size} OFFSET {offset}"

        # Определяем сортировку
        order_by = "timestamp DESC"  # По умолчанию новые сначала
        if sort_by == 'date_asc':
            order_by = "timestamp ASC"
        elif sort_by == 'title_asc':
            order_by = "title ASC"
        elif sort_by == 'title_desc':
            order_by = "title DESC"

        # Основной запрос с динамической сортировкой
        query = f"""
            SELECT id, title, link, date, summary, tags, image_url, reading_time, timestamp
            FROM news 
            {where_clause} 
            ORDER BY {order_by}
            {limit_clause}
        """
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()

        # Формируем данные в нужном формате
        items = []
        for row in rows:
            (news_id, title, link, date, summary, tags, image_url, reading_time, timestamp) = row
            
            # Определяем категорию из тегов
            news_category = 'general'  # категория по умолчанию
            if tags:
                tags_lower = tags.lower()
                if 'academic' in tags_lower or 'наука' in tags_lower:
                    news_category = 'academic'
                elif 'achievements' in tags_lower or 'достижения' in tags_lower:
                    news_category = 'achievements'
                elif 'events' in tags_lower or 'мероприятия' in tags_lower:
                    news_category = 'events'
            
            # Передаем timestamp для корректной сортировки и конвертации на фронтенде
            
            # Парсим теги из строки
            parsed_tags = []
            if tags:
                # Разделяем теги по запятым или другим разделителям
                import re
                tag_list = re.split(r'[,;]\s*', tags.strip())
                parsed_tags = []
                for tag in tag_list:
                    clean_tag = tag.strip()
                    # Удаляем все # в начале и другие символы
                    clean_tag = re.sub(r'^#+', '', clean_tag)
                    # Удаляем лишние пробелы
                    clean_tag = clean_tag.strip()
                    if clean_tag:
                        parsed_tags.append(clean_tag)
            
            items.append({
                'id': news_id,
                'title': title or '',
                'excerpt': summary or '',
                'content': summary or '',  # Используем summary как контент
                'category': news_category,
                'tags': parsed_tags,  # Добавляем теги
                'author': 'БНТУ',
                'date': date,  # Передаем оригинальную дату
                'timestamp': timestamp,  # Добавляем timestamp для сортировки
                'imageUrl': image_url or '',
                'link': link or '',
                'featured': False,  # Можно определить по тегам если нужно
                'readTime': f"{reading_time or 5} мин"
            })

        return JsonResponse({
            "success": True,
            "page": page,
            "page_size": page_size,
            "total": total,
            "items": items,
        }, status=200, json_dumps_params={'ensure_ascii': False})

    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return JsonResponse({"detail": "Ошибка базы данных новостей"}, status=500)
    except Exception as e:
        print(f"Unexpected error: {e}")
        return JsonResponse({"detail": f"Внутренняя ошибка сервера: {str(e)}"}, status=500)
