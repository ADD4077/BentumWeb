"""
URL модуля 2FA - Двухфакторная аутентификация
"""
from django.urls import path
from . import views

urlpatterns = [
    path('config', views.get_2fa_config, name='get_2fa_config'),
    path('test', views.test_2fa, name='test_2fa'),
    path('verify', views.verify_2fa, name='verify_2fa'),
    path('resend', views.resend_2fa_code, name='resend_2fa_code'),
]
