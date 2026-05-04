"""
URL модуля интеграции Telegram
"""
from django.urls import path
from . import views

urlpatterns = [
    path('generate-link', views.generate_telegram_link, name='generate_telegram_link'),
    path('binding-status', views.get_telegram_binding_status, name='get_telegram_binding_status'),
    path('unlink', views.unlink_telegram_account, name='unlink_telegram_account'),
    path('bind', views.process_telegram_callback, name='process_telegram_callback'),
]
