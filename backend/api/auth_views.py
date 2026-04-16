"""
Представления для аутентификации и управления сессиями
"""
import json
import logging
from datetime import datetime
from django.utils import timezone
from django.conf import settings
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.cache import cache

from .models import User, UserSession, Administration
from .func import authorize
from .user_notification_service import UserNotificationService
from .ban_service import BanService
from .twofa_service import twofa_service
from .utils import get_user_full_data

logger = logging.getLogger(__name__)

SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30


def _check_login_attempts(student_code: str) -> tuple[bool, str]:
    """Проверяет количество попыток входа для защиты от подбора пароля"""
    user_key = f"login_attempts_user:{student_code}"
    user_attempts = cache.get(user_key, 0)
    
    if user_attempts >= 5:
        return False, "Слишком много попыток входа. Попробуйте позже."
    
    cache.set(user_key, user_attempts + 1, 15)
    return True, ""


def _clear_login_attempts(student_code: str):
    """Сбрасывает счетчики попыток входа после успешной авторизации"""
    cache.delete(f"login_attempts_user:{student_code}")


def _enforce_session_limits(student_code: str, current_session_key: str, request=None) -> None:
    if not student_code or not current_session_key:
        return

    browser_info = {}
    ip_address = None
    
    if request:
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0].strip()
        else:
            ip_address = request.META.get('REMOTE_ADDR')
        
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        from .user_agent_parser import UserAgentParser
        browser_info = UserAgentParser.parse(user_agent)

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
    
    if not created:
        session.last_activity = timezone.now()
        session.save()

    from django.contrib.sessions.models import Session
    sessions = list(
        UserSession.objects.filter(student_code=student_code).order_by('-created_at')
    )
    if len(sessions) <= 2:
        return

    for s in sessions[2:]:
        Session.objects.filter(session_key=s.session_key).delete()
        s.delete()


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

        can_login, error_message = _check_login_attempts(student_code)
        if not can_login:
            return JsonResponse(
                {"detail": error_message},
                status=429
            )

        existing_user = User.objects.filter(student_code=student_code).first()
        if existing_user:
            if existing_user.bilet_code != red_code:
                return JsonResponse(
                    {"detail": "Неверный пароль"},
                    status=401
                )
            
            _clear_login_attempts(student_code)
            existing_user.last_login = get_unix_timestamp()
            existing_user.save()
            
            request.session['student_code'] = existing_user.student_code
            request.session['fullname'] = existing_user.fullname
            request.session['faculty'] = existing_user.faculty
            request.session['is_authenticated'] = True
            request.session.set_expiry(SESSION_MAX_AGE_SECONDS)
            request.session.save()

            _enforce_session_limits(existing_user.student_code, request.session.session_key, request)
            
            ban_status = BanService.check_ban_status(existing_user.student_code)
            admin_check = Administration.objects.filter(administrator=existing_user, is_active=True).exists()
            
            if twofa_service.is_2fa_required(existing_user):
                existing_code, remaining_time = twofa_service.get_existing_code(existing_user.student_code)
                
                if existing_code and remaining_time > 0:
                    code = existing_code
                    logger.info(f"Reusing existing 2FA code for {existing_user.student_code}, remaining: {remaining_time}s")
                else:
                    code = twofa_service.generate_6fa_code()
                    twofa_service.store_2fa_code(existing_user.student_code, code, request)
                    logger.info(f"Generated new 2FA code for {existing_user.student_code}")
                    
                    if existing_user.twofa_method == 'telegram':
                        success, message = twofa_service.send_2fa_code_telegram_sync(existing_user, code)
                        if not success:
                            return JsonResponse({
                                "success": False,
                                "detail": f"Ошибка отправки 2FA кода: {message}"
                            }, status=500)
                    elif existing_user.twofa_method == 'email':
                        success, message = twofa_service.send_2fa_code_email(existing_user, code)
                        if not success:
                            return JsonResponse({
                                "success": False,
                                "detail": f"Ошибка отправки 2FA кода на email: {message}"
                            }, status=500)
                
                request.session['twofa_pending'] = True
                request.session['twofa_verified'] = False
                request.session.save()
                
                return JsonResponse({
                    "success": True,
                    "message": "Вход выполнен, требуется подтверждение 2FA",
                    "requires_2fa": True,
                    "remaining_time": remaining_time if 'remaining_time' in locals() else 300,
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
        
        _clear_login_attempts(student_code)
        
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
    """Личный кабинет пользователя"""
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
    """Проверка статуса авторизации пользователя"""
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
        
        twofa_enabled = getattr(user, 'twofa_enabled', False)
        twofa_verified = request.session.get('twofa_verified', False)
        twofa_pending = request.session.get('twofa_pending', False)
        
        if twofa_enabled and not twofa_verified:
            return JsonResponse({
                "success": False,
                "detail": "Требуется повторная аутентификация"
            }, status=401)
        
        user_data = get_user_full_data(user)
        
        return JsonResponse({
            "success": True,
            "user": user_data
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
    """Выход из системы - очистка сессии"""
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
def get_user_sessions(request):
    """Получение активных сессий пользователя"""
    try:
        if not request.session.get('is_authenticated'):
            return JsonResponse({
                "success": False,
                "detail": "Требуется авторизация"
            }, status=401)
        
        student_code = request.session.get('student_code')
        current_session_key = request.session.session_key
        
        sessions = UserSession.objects.filter(
            student_code=student_code
        ).order_by('-last_activity')
        
        sessions_data = []
        for session in sessions:
            is_current = session.session_key == current_session_key
            
            session_data = {
                'id': session.id,
                'session_key': session.session_key,
                'browser': session.browser or 'Неизвестный браузер',
                'os': session.os or 'Неизвестная ОС',
                'ip_address': session.ip_address or 'Неизвестный IP',
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
