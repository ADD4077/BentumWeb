import json
import logging
import random
import string
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view
from django.core.cache import cache
from django.conf import settings
import urllib.parse

from ...models import User, TelegramBinding
from ...twofa_service import TwoFAService


# Создаем экземпляр сервиса
twofa_service = TwoFAService()

@csrf_exempt
@api_view(['GET', 'POST'])
def get_2fa_config(request):
    """Получить текущую конфигурацию 2FA"""
    try:
        if not request.session.get('is_authenticated'):
            return JsonResponse({'success': False, 'detail': 'Не авторизован'}, status=401)

        student_code = request.session.get('student_code')
        if not student_code:
            return JsonResponse({'success': False, 'detail': 'Сессия не найдена'}, status=401)

        user = User.objects.filter(student_code=student_code).first()
        if not user:
            return JsonResponse({'success': False, 'detail': 'Пользователь не найден'}, status=404)

        binding = TelegramBinding.objects.filter(user=user, is_active=True).select_related('user').first()

        # Обработка POST запроса для установки конфигурации 2FA
        if request.method == 'POST':
            try:
                data = json.loads(request.body)
            except:
                return JsonResponse({'success': False, 'detail': 'Неверный формат JSON'}, status=400)
            
            enabled = bool(data.get('enabled', False))
            method = data.get('method')
            
            if enabled:
                if method not in ['telegram', 'email']:
                    return JsonResponse({'success': False, 'detail': 'Неверный метод'}, status=400)

                if method == 'telegram':
                    binding = TelegramBinding.objects.filter(user=user, is_active=True).select_related('user').first()
                    if not binding or not binding.telegram_id or binding.telegram_id == 0:
                        return JsonResponse({'success': False, 'detail': 'Telegram аккаунт не привязан'}, status=400)

                user.twofa_enabled = True
                user.twofa_method = method
                user.save(update_fields=['twofa_enabled', 'twofa_method'])

                return JsonResponse({'success': True, 'message': f'2FA включен с методом {method}'})

            user.twofa_enabled = False
            user.twofa_method = None
            user.save(update_fields=['twofa_enabled', 'twofa_method'])

            return JsonResponse({'success': True, 'message': '2FA отключен'})
        
        # Обработка GET запроса для получения конфигурации 2FA
        return JsonResponse({
            'success': True,
            'data': {
                'enabled': bool(getattr(user, 'twofa_enabled', False)),
                'method': getattr(user, 'twofa_method', None),
                'telegram_linked': bool(binding and binding.telegram_id and binding.telegram_id != 0)
            }
        })
    except Exception as e:
        return JsonResponse({'success': False, 'detail': str(e)}, status=500)

@csrf_exempt
@api_view(['GET', 'POST'])
def test_2fa(request):
    """Тестовый endpoint 2FA"""
    return JsonResponse({'success': True, 'message': 'Тестовый endpoint 2FA работает', 'method': request.method})

@csrf_exempt
@api_view(['POST'])
def verify_2fa(request):
    """Проверить код 2FA"""
    try:
        if not request.session.get('is_authenticated'):
            return JsonResponse({'success': False, 'detail': 'Не авторизован'}, status=401)

        if not request.session.get('twofa_pending'):
            return JsonResponse({'success': False, 'detail': '2FA не ожидается'}, status=400)

        student_code = request.session.get('student_code')
        if not student_code:
            return JsonResponse({'success': False, 'detail': 'Сессия не найдена'}, status=401)
        
        # Разбираем данные запроса
        try:
            data = json.loads(request.body)
        except:
            return JsonResponse({'success': False, 'detail': 'Invalid JSON'}, status=400)
        
        code = data.get('code')
        
        if not code:
            return JsonResponse({'success': False, 'detail': 'Код обязателен'}, status=400)
        
        if len(code) != 6 or not code.isdigit():
            return JsonResponse({'success': False, 'detail': 'Неверный формат кода'}, status=400)

        if not twofa_service.verify_2fa_code(student_code, code, request):
            return JsonResponse({'success': False, 'detail': 'Неверный код'}, status=400)

        # Сохраняем сессию с проверкой на ошибки
        try:
            request.session['twofa_pending'] = False
            request.session['twofa_verified'] = True
            request.session.save()
        except Exception as e:
            # Пробуем еще раз
            try:
                request.session.save()
            except:
                pass

        return JsonResponse({'success': True, 'message': 'Проверка 2FA успешна'})
            
    except Exception as e:
        return JsonResponse({'success': False, 'detail': str(e)}, status=500)

@csrf_exempt
@api_view(['POST'])
def resend_2fa_code(request):
    """Повторная отправка кода 2FA"""
    try:
        if not request.session.get('is_authenticated'):
            return JsonResponse({'success': False, 'detail': 'Не авторизован'}, status=401)

        if not request.session.get('twofa_pending'):
            return JsonResponse({'success': False, 'detail': '2FA не ожидается'}, status=400)

        student_code = request.session.get('student_code')
        if not student_code:
            return JsonResponse({'success': False, 'detail': 'Сессия не найдена'}, status=401)

        user = User.objects.filter(student_code=student_code).first()
        if not user:
            return JsonResponse({'success': False, 'detail': 'Пользователь не найден'}, status=404)

        if not twofa_service.is_2fa_required(user):
            return JsonResponse({'success': False, 'detail': '2FA не включен'}, status=400)

        # Проверяем существующий действительный код
        existing_code, remaining_time = twofa_service.get_existing_code(student_code)
        
        # Ограничение частоты: отправляем повторно только если осталось менее 2 минут
        if existing_code and remaining_time > 120:
            return JsonResponse({
                'success': False,
                'detail': f'Код еще действителен. Осталось {remaining_time} секунд.',
                'remaining_time': remaining_time
            }, status=429)
        
        # Генерируем новый код, если существующий истек или не существует
        code = twofa_service.generate_6fa_code()
        twofa_service.store_2fa_code(student_code, code, request)

        if user.twofa_method == 'telegram':
            ok, message = twofa_service.send_2fa_code_telegram_sync(user, code)
            if not ok:
                return JsonResponse({'success': False, 'detail': message}, status=500)
        elif user.twofa_method == 'email':
            ok, message = twofa_service.send_2fa_code_email(user, code)
            if not ok:
                return JsonResponse({'success': False, 'detail': message}, status=500)

        return JsonResponse({'success': True, 'message': 'Код 2FA успешно отправлен повторно'})
        
    except Exception as e:
        return JsonResponse({'success': False, 'detail': str(e)}, status=500)
