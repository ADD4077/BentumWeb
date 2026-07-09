"""
URL модуля ядра.
"""

from django.urls import path

from . import views

urlpatterns = [
    path('csrf', views.csrf_token, name='csrf_token'),
    path('save_data', views.save_data, name='save_data'),
    path('auth/check', views.auth_check, name='auth_check'),
    path('logout', views.logout, name='logout'),
    path('theme', views.theme, name='theme'),
    path('dashboard', views.dashboard, name='dashboard'),
    path('sessions', views.get_user_sessions, name='get_user_sessions'),
    path('sessions/close', views.close_user_session, name='close_user_session'),
]
