"""
URL модуля ядра - Аутентификация и управление пользователями
"""
from django.urls import path
from . import views

urlpatterns = [
    # Аутентификация
    path('save_data', views.save_data, name='save_data'),
    path('auth/check', views.auth_check, name='auth_check'),
    path('logout', views.logout, name='logout'),
    path('theme', views.theme, name='theme'),
    
    # Дашборд
    path('dashboard', views.dashboard, name='dashboard'),
    
    # Управление сессиями
    path('sessions', views.get_user_sessions, name='get_user_sessions'),
]
