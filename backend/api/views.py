import json
import os
import re
import sqlite3
from datetime import datetime
from django.utils import timezone
from django.conf import settings
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from .func import authorize
from django.contrib.sessions.models import Session
from django.contrib.sessions.backends.db import SessionStore
from django.conf import settings
from django.core.cache import cache

from .models import User, UserSession
from .func import authorize
from .user_notification_service import UserNotificationService
from .ban_service import BanService


SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30


def _check_login_attempts(student_code: str) -> tuple[bool, str]:
    """Проверяет количество попыток входа для защиты от подбора пароля"""
    
    # Ключ для кэша
    user_key = f"login_attempts_user:{student_code}"
    
    # Получаем текущий счетчик
    user_attempts = cache.get(user_key, 0)
    
    # Проверяем лимиты
    if user_attempts >= 5:
        return False, "Слишком много попыток входа. Попробуйте позже."
    
    # Увеличиваем счетчик
    cache.set(user_key, user_attempts + 1, 15)  # 15 секунд
    
    return True, ""


def _clear_login_attempts(student_code: str):
    """Сбрасывает счетчики попыток входа после успешной авторизации"""
    cache.delete(f"login_attempts_user:{student_code}")


def _enforce_session_limits(student_code: str, current_session_key: str, request=None) -> None:
    if not student_code or not current_session_key:
        return

    # Собираем информацию о браузере и ОС
    browser_info = {}
    ip_address = None
    
    if request:
        # Получаем IP адрес
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0].strip()
        else:
            ip_address = request.META.get('REMOTE_ADDR')
        
        # Парсим User-Agent
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        from .user_agent_parser import UserAgentParser
        browser_info = UserAgentParser.parse(user_agent)

    # Создаем или обновляем сессию с расширенной информацией
    session, created = UserSession.objects.get_or_create(
        session_key=current_session_key,
        defaults={
            "student_code": student_code,
            "user_agent": request.META.get('HTTP_USER_AGENT', '') if request else '',
            "browser": browser_info.get("browser"),
            "os": browser_info.get("os"),
            "ip_address": ip_address,
        }
    )
    
    # Если сессия уже существует, обновляем информацию о последней активности
    if not created:
        session.last_activity = timezone.now()
        session.save()

    sessions = list(
        UserSession.objects.filter(student_code=student_code).order_by('-created_at')
    )
    if len(sessions) <= 2:
        return

    for s in sessions[2:]:
        Session.objects.filter(session_key=s.session_key).delete()
        s.delete()


# Вспомогательная функция для получения времени в UNIX формате
def get_unix_timestamp():
    return int(datetime.now().timestamp())


@csrf_exempt
def save_data(request):
    if request.method != "POST":
        return JsonResponse(
            {"detail": "Метод не разрешён"},
            status=405
        )


    try:
        if isinstance(request.body, bytes):
            body_str = request.body.decode('utf-8')
        else:
            body_str = request.body
        
        data = json.loads(body_str)
        student_code = data.get("studentCode")
        red_code = data.get("studentRedCode")

        if not student_code or not red_code:
            return JsonResponse(
                {"detail": "Отсутствуют обязательные поля"},
                status=400
            )

        if len(student_code) != 10 or len(red_code) < 7:
            return JsonResponse(
                {"detail": "Некорректный формат кодов. Пароль должен содержать минимум 7 символов"},
                status=400
            )

        # Проверяем количество попыток входа
        can_login, error_message = _check_login_attempts(student_code)
        if not can_login:
            return JsonResponse(
                {"detail": error_message},
                status=429  # Too Many Requests
            )

        existing_user = User.objects.filter(student_code=student_code).first()
        if existing_user:
            # Проверяем пароль (bilet_code) для существующего пользователя
            if existing_user.bilet_code != red_code:
                return JsonResponse(
                    {"detail": "Неверный пароль"},
                    status=401
                )
            
            # Сбрасываем счетчики попыток после успешного входа
            _clear_login_attempts(student_code)
            
            # Обновляем время входа
            existing_user.last_login = get_unix_timestamp()
            existing_user.save()
            
            request.session['student_code'] = existing_user.student_code
            request.session['fullname'] = existing_user.fullname
            request.session['faculty'] = existing_user.faculty
            request.session['is_authenticated'] = True

            request.session.set_expiry(SESSION_MAX_AGE_SECONDS)
            
            request.session.save()

            _enforce_session_limits(existing_user.student_code, request.session.session_key, request)
            
            # Проверяем статус бана через BanService
            ban_status = BanService.check_ban_status(existing_user.student_code)
            
            # Проверяем права администратора
            from .models import Administration
            admin_check = Administration.objects.filter(administrator=existing_user, is_active=True).exists()
            
            # Проверяем 2FA
            from .twofa_service import twofa_service
            if twofa_service.is_2fa_required(existing_user):
                # Генерируем и отправляем 2FA код
                code = twofa_service.generate_6fa_code()
                twofa_service.store_2fa_code(existing_user.student_code, code)
                
                # Отправляем код в Telegram
                if existing_user.twofa_method == 'telegram':
                    success, message = twofa_service.send_2fa_code_telegram_sync(existing_user, code)
                    if not success:
                        return JsonResponse({
                            "success": False,
                            "detail": f"Ошибка отправки 2FA кода: {message}"
                        }, status=500)
                
                # Помечаем сессию как ожидающую 2FA
                request.session['twofa_pending'] = True
                request.session['twofa_verified'] = False
                request.session.save()
                
                return JsonResponse({
                    "success": True,
                    "message": "Вход выполнен, требуется подтверждение 2FA",
                    "requires_2fa": True,
                    "user": {
                        "id": existing_user.id,
                        "fullname": existing_user.fullname,
                        "student_code": existing_user.student_code,
                        "faculty": existing_user.faculty,
                        "is_banned": ban_status['is_banned'],
                        "is_admin": admin_check,
                        "created_at": existing_user.created_at
                    }
                }, status=200)
            
            # Если 2FA не требуется, завершаем вход
            return JsonResponse({
                "success": True,
                "message": "Вход выполнен успешно",
                "user": {
                    "id": existing_user.id,
                    "fullname": existing_user.fullname,
                    "student_code": existing_user.student_code,
                    "faculty": existing_user.faculty,
                    "is_banned": ban_status['is_banned'],
                    "is_admin": admin_check,
                    "created_at": existing_user.created_at
                }
            }, status=200)

        auth_result = authorize(student_code, red_code)
        
        if auth_result is False:
            return JsonResponse(
                {"detail": "Неверные данные авторизации"},
                status=401
            )
        
        # Сбрасываем счетчики попыток после успешной авторизации
        _clear_login_attempts(student_code)
        
        fullname, faculty = auth_result
        
        user = User.objects.create(
            fullname=fullname,
            faculty=faculty,
            student_code=student_code,
            bilet_code=red_code,
            created_at=get_unix_timestamp(),
            last_login=get_unix_timestamp()
        )
        
        # Сбрасываем счетчики попыток после успешной регистрации
        _clear_login_attempts(student_code)
        
        # Отправляем уведомление о новом пользователе в Telegram
        try:
            notification_service = UserNotificationService()
            user_data = {
                'id': user.id,
                'fullname': user.fullname,
                'student_code': user.student_code,
                'faculty': user.faculty
            }
            notification_service.send_new_user_notification(user_data)
        except Exception as e:
            # Не прерываем процесс авторизации если уведомление не отправилось
            pass
                
        request.session['student_code'] = user.student_code
        request.session['fullname'] = user.fullname
        request.session['faculty'] = user.faculty
        request.session['is_authenticated'] = True

        request.session.set_expiry(SESSION_MAX_AGE_SECONDS)
        
        request.session.save()

        _enforce_session_limits(user.student_code, request.session.session_key, request)
        
        
        response_data = {
            "success": True,
            "message": "Регистрация прошла успешно",
            "user": {
                "id": user.id,
                "fullname": user.fullname,
                "student_code": user.student_code,
                "faculty": user.faculty,
                "created_at": user.created_at
            }
        }
        
        response = HttpResponse(
            json.dumps(response_data),
            content_type='application/json',
            status=200
        )
        
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
        return JsonResponse(
            {"detail": "Некорректный JSON"},
            status=400
        )

    except Exception as e:
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
    
    student_code = request.GET.get('student_code')
    
    
    if not student_code:
        student_code = request.session.get('student_code')
    
    if not request.session.get('is_authenticated') or not student_code:
        return JsonResponse(
            {"detail": "Пользователь не авторизован"},
            status=401
        )
    
    try:
        user = User.objects.get(student_code=student_code)
        
        session_student_code = request.session.get('student_code')
        if session_student_code != student_code:
            return JsonResponse(
                {"detail": "Доступ запрещён"},
                status=403
            )
        
        # Проверяем статус бана через BanService
        ban_status = BanService.check_ban_status(student_code)
        
        return JsonResponse({
            "success": True,
            "theme": request.session.get('theme', 'dark'),
            "user": {
                "id": user.id,
                "fullname": user.fullname,
                "faculty": user.faculty,
                "student_code": user.student_code,
                "created_at": user.created_at,
                "is_banned": ban_status['is_banned'],
                "last_login": user.last_login
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
def auth_check(request):
    """
    Проверка статуса авторизации пользователя
    """
    if request.method != "GET":
        return JsonResponse(
            {"detail": "Метод не разрешён"},
            status=405
        )
    
    if not request.session.get('is_authenticated'):
        return JsonResponse(
            {"success": False, "detail": "Пользователь не авторизован"},
            status=401
        )
    
    student_code = request.session.get('student_code')
    if not student_code:
        return JsonResponse(
            {"success": False, "detail": "Отсутствует код студента"},
            status=401
        )
    
    try:
        user = User.objects.get(student_code=student_code)
        
        # Проверяем статус бана через BanService
        ban_status = BanService.check_ban_status(student_code)
        
        # Проверяем права администратора
        from .models import Administration
        admin_check = Administration.objects.filter(administrator=user, is_active=True).exists()
        
        return JsonResponse({
            "success": True,
            "user": {
                "id": user.id,
                "fullname": user.fullname,
                "student_code": user.student_code,
                "faculty": user.faculty,
                "is_banned": ban_status['is_banned'],
                "is_admin": admin_check,
                "created_at": user.created_at
            }
        }, status=200)
    
    except User.DoesNotExist:
        return JsonResponse(
            {"success": False, "detail": "Пользователь не найден"},
            status=404
        )
    
    except Exception as e:
        return JsonResponse(
            {"success": False, "detail": "Ошибка при проверке авторизации"},
            status=500
        )


@csrf_exempt
def logout(request):
    """
    Выход из системы - очистка сессии
    """
    try:
        session_key = request.session.session_key
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
        db_path = os.path.join(settings.BASE_DIR, 'schedules', 'schedules.db')
        
        if not os.path.exists(db_path):
            return JsonResponse(
                {"detail": "База данных расписаний не найдена"},
                status=404
            )
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        group_id = student_code[:8]
        
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
        
        schedule_data = {}
        
        for row in rows:
            day, week, time, matter, frame, teacher, classroom = row
            
            if day not in schedule_data:
                schedule_data[day] = {}
            week_type = 'upper' if week == 1 else 'lower'
            if week_type not in schedule_data[day]:
                schedule_data[day][week_type] = []
            
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
        return JsonResponse(
            {"detail": "Ошибка базы данных расписаний"},
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

        if isinstance(size, (int, float)):
            try:
                return f"{float(size):.2f}"
            except Exception:
                return str(size)

        s = str(size).strip()
        s = re.sub(r'([0-9]+)\.([kKmMgGtT]?)\s*([bB])', r'\1\2\3', s)
        m = re.match(r"^\s*([0-9]+(?:[.,][0-9]+)?)\s*([kKmMgGtT]?\s*[bB])?\s*$", s)
        if not m:
            return s

        num = m.group(1).replace(',', '.')
        unit = (m.group(2) or '').replace(' ', '')
        unit = unit.upper() if unit else ''

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
        m = re.match(r"^\s*([0-9]+(?:[.,][0-9]*)?)\s*([kKmMgGtT]?\s*[bB])?\s*$", s)
        if not m:
            return 0
        
        try:
            num = float(m.group(1).replace(',', '.'))
            unit = (m.group(2) or '').replace(' ', '').upper()
            
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
    categories = request.GET.getlist('category')

    try:
        db_path = os.path.join(settings.BASE_DIR, 'books', 'literature.db')
        
        if not os.path.exists(db_path):
            return JsonResponse({"detail": "База данных литературы не найдена"}, status=404)

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        where_conditions = []
        params = []

        if categories and 'all' not in categories:
            # Фильтрация по нескольким категориям
            placeholders = ','.join(['?' for _ in categories])
            where_conditions.append(f"category IN ({placeholders})")
            params.extend(categories)

        if search:
            # Мощный поиск по названию, авторам и описанию (работает с кириллицей)
            search_terms = search.strip().split()
            search_conditions = []
            
            for term in search_terms:
                if term:  # Пропускаем пустые термины
                    # Ищем в разных регистрах для кириллицы
                    term_lower = f"%{term.lower()}%"
                    term_upper = f"%{term.upper()}%"
                    term_title = f"%{term.title()}%"
                    
                    conditions = []
                    conditions.extend([
                        "title LIKE ? OR title LIKE ? OR title LIKE ?",
                        "authors LIKE ? OR authors LIKE ? OR authors LIKE ?", 
                        "description LIKE ? OR description LIKE ? OR description LIKE ?"
                    ])
                    
                    params.extend([
                        term_lower, term_upper, term_title,  # title
                        term_lower, term_upper, term_title,  # authors
                        term_lower, term_upper, term_title   # description
                    ])
                    
                    search_conditions.append(f"({' OR '.join(conditions) })")
            
            if search_conditions:
                where_conditions.append("(" + " OR ".join(search_conditions) + ")")

        where_clause = ""
        if where_conditions:
            where_clause = "WHERE " + " AND ".join(where_conditions)

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

        if sort_param in ['size_desc', 'size_asc']:
            query = f"""
                SELECT rowid, title, faculty, category, authors, publishing_date, 
                       description, image_url, download_size, download_link
                FROM literature 
                {where_clause}
            """
            cursor.execute(query, params)
            all_rows = cursor.fetchall()
            conn.close()
            
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
            
            reverse = sort_param == 'size_desc'
            all_items.sort(key=lambda x: _parse_size(x.get('downloadSizeRaw', '') or '0'), reverse=reverse)
            
            total = len(all_items)
            start = (page - 1) * page_size
            end = start + page_size
            items = all_items[start:end]
            
        else:
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
        return JsonResponse({"detail": "Ошибка базы данных литературы"}, status=500)
    except Exception as e:
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

    search = (request.GET.get('search') or '').strip()
    category = (request.GET.get('category') or '').strip()
    sort_by = (request.GET.get('sort_by') or 'date_desc').strip()

    try:
        db_path = os.path.join(settings.BASE_DIR, 'news', 'times_news.db')
        
        if not os.path.exists(db_path):
            return JsonResponse({"detail": "База данных новостей не найдена"}, status=404)

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        where_conditions = []
        params = []

        if category and category != 'all':
            # Фильтруем по полным фразам из тегов
            if category == 'academic':
                where_conditions.append("(tags LIKE ? OR tags LIKE ?)")
                params.extend(['%Преподаватели БНТУ%', '%БНТУ%'])
            elif category == 'achievements':
                where_conditions.append("(tags LIKE ? OR tags LIKE ?)")
                params.extend(['%Спорт%', '%Культура%'])
            elif category == 'education':
                where_conditions.append("(tags LIKE ?)")
                params.append('%Студенты%')
            elif category == 'events':
                where_conditions.append("(tags LIKE ? OR tags LIKE ?)")
                params.extend(['%Мероприятие%', '%Преподаватели БНТУ%'])
            elif category == 'sports':
                where_conditions.append("(tags LIKE ?)")
                params.append('%Спорт%')

        if search:
            # Мощный поиск по названию, краткому описанию и тегам (без учета регистра)
            search_terms = search.strip().split()
            search_conditions = []
            
            for term in search_terms:
                if term:  # Пропускаем пустые термины
                    term_pattern = f"%{term}%"
                    search_conditions.append("(LOWER(title) LIKE ? OR LOWER(summary) LIKE ? OR LOWER(tags) LIKE ?)")
                    params.extend([term_pattern, term_pattern, term_pattern])
            
            if search_conditions:
                where_conditions.append("(" + " OR ".join(search_conditions) + ")")

        where_clause = ""
        if where_conditions:
            where_clause = "WHERE " + " AND ".join(where_conditions)

        count_query = f"SELECT COUNT(*) FROM news {where_clause}"
        cursor.execute(count_query, params)
        total = cursor.fetchone()[0]

        offset = (page - 1) * page_size
        limit_clause = f"LIMIT {page_size} OFFSET {offset}"

        order_by = "timestamp DESC"  # По умолчанию новые сначала
        if sort_by == 'date_asc':
            order_by = "timestamp ASC"
        elif sort_by == 'title_asc':
            order_by = "title ASC"
        elif sort_by == 'title_desc':
            order_by = "title DESC"

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

        items = []
        for row in rows:
            (news_id, title, link, date, summary, tags, image_url, reading_time, timestamp) = row
            
            news_category = 'general'  # категория по умолчанию
            if tags:
                # Определяем категорию на основе того, по какому фильтру пришли
                if category and category != 'all':
                    news_category = category  # Просто присваиваем категорию фильтра
                else:
                    # Только для "all" определяем категорию по тегам
                    tag_words = [word.strip().replace('#', '').lower() for word in tags.split(',')]
                    if 'студенты' in tag_words:
                        news_category = 'education'
                    elif 'мероприятие' in tag_words:
                        news_category = 'events'
                    elif 'спорт' in tag_words:
                        news_category = 'sports'
                    elif 'культура' in tag_words:
                        news_category = 'achievements'
                    elif 'преподаватели бнту' in tag_words or 'бнту' in tag_words:
                        news_category = 'academic'
            
            
            parsed_tags = []
            if tags:
                import re
                tag_list = re.split(r'[,;]\s*', tags.strip())
                parsed_tags = []
                for tag in tag_list:
                    clean_tag = tag.strip()
                    clean_tag = re.sub(r'^#+', '', clean_tag)
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
        return JsonResponse({"detail": "Ошибка базы данных новостей"}, status=500)
    except Exception as e:
        return JsonResponse({"detail": f"Внутренняя ошибка сервера: {str(e)}"}, status=500)


@csrf_exempt
@api_view(['GET'])
def get_user_by_code(request, student_code):
    """Получить информацию о пользователе по студенческому коду"""
    try:
        # Ищем пользователя по студенческому коду
        user = User.objects.filter(student_code=student_code).first()
        
        if not user:
            # Для карусели и других компонентов возвращаем пустые данные вместо 404
            return JsonResponse({
                'success': True,
                'user': None
            })
        
        # Проверяем статус бана
        ban_status = BanService.check_ban_status(student_code)
        
        # Проверяем права администратора
        from .models import Administration
        admin_check = Administration.objects.filter(administrator=user, is_active=True).exists()
        
        # Получаем активные медиа файлы или плейсхолдеры (как в profile_views.update_profile)
        avatar_url = None
        banner_url = None
        avatar_placeholder = None
        banner_placeholder = None

        from .models import UserProfileMedia
        from .media_service import MediaStorage

        active_avatar = UserProfileMedia.objects.filter(
            user=user,
            media_type='avatar',
            is_active=True
        ).first()
        if active_avatar:
            avatar_url = MediaStorage.get_media_url(active_avatar, 'medium')
        else:
            avatar_placeholder = MediaStorage.get_placeholder_data(user, 'avatar')

        active_banner = UserProfileMedia.objects.filter(
            user=user,
            media_type='banner',
            is_active=True
        ).first()
        if active_banner:
            banner_url = MediaStorage.get_media_url(active_banner, 'medium')
        else:
            banner_placeholder = MediaStorage.get_placeholder_data(user, 'banner')

        # Формируем ответ
        user_data = {
            'id': user.id,
            'fullname': user.fullname,
            'student_code': user.student_code,
            'faculty': user.faculty,
            'created_at': user.created_at,
            'last_login': user.last_login,
            'status': 'banned' if ban_status['is_banned'] else 'active',
            'is_admin': admin_check,
            'is_banned': ban_status['is_banned'],
            'avatar_url': avatar_url,
            'banner_url': banner_url,
            'avatar_placeholder': avatar_placeholder,
            'banner_placeholder': banner_placeholder,
        }
            
        return JsonResponse({
            'success': True,
            'user': user_data
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'detail': f'Ошибка: {str(e)}'
        }, status=500)

@csrf_exempt
@api_view(['GET'])
def get_public_stats(request):
    """
    Публичный эндпоинт для получения статистики (доступен всем)
    """
    if request.method != "GET":
        return JsonResponse(
            {"detail": "Метод не разрешён"},
            status=405
        )
    
    try:
        from .models import User
        from .ban_service import BanService
        
        total_users = User.objects.count()
        
        # Считаем количество уникальных факультетов
        unique_faculties = User.objects.values_list('faculty', flat=True).distinct()
        faculties_count = len([f for f in unique_faculties if f])
        
        # Считаем заблокированных пользователей
        banned_count = 0
        for user in User.objects.all():
            ban_status = BanService.check_ban_status(user.student_code)
            if ban_status['is_banned']:
                banned_count += 1
        
        return JsonResponse({
            "success": True,
            "stats": {
                "totalUsers": total_users,
                "facultiesCount": faculties_count,
                "bannedUsers": banned_count,
                "activeUsers": total_users - banned_count,
                "uptime": "99.9%"
            }
        })
        
    except Exception as e:
        return JsonResponse({
            "success": False,
            "detail": f"Ошибка загрузки статистики: {str(e)}"
        }, status=500)


@csrf_exempt
@api_view(["GET"])
def get_user_sessions(request):
    """Получение активных сессий пользователя"""
    
    try:
        # Проверяем авторизацию
        if not request.session.get('is_authenticated'):
            return JsonResponse({
                "success": False,
                "detail": "Требуется авторизация"
            }, status=401)
        
        student_code = request.session.get('student_code')
        current_session_key = request.session.session_key
        
        # Получаем все сессии пользователя
        sessions = UserSession.objects.filter(
            student_code=student_code
        ).order_by('-last_activity')
        
        sessions_data = []
        for session in sessions:
            # Определяем текущую сессию
            is_current = session.session_key == current_session_key
            
            # Форматируем данные
            session_data = {
                'id': session.id,
                'session_key': session.session_key,
                'browser': session.browser or 'Unknown Browser',
                'os': session.os or 'Unknown OS',
                'ip_address': session.ip_address or 'Unknown IP',
                'created_at': session.created_at.isoformat() if session.created_at else None,
                'last_activity': session.last_activity.isoformat() if session.last_activity else None,
                'is_current': is_current,
                'status': 'active' if is_current else 'inactive'
            }
            sessions_data.append(session_data)
        
        return JsonResponse({
            "success": True,
            "sessions": sessions_data,
            "total_count": len(sessions_data)
        })
        
    except Exception as e:
        return JsonResponse({
            "success": False,
            "detail": f"Ошибка загрузки сессий: {str(e)}"
        }, status=500)
