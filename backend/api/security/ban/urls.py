"""
URL модуля банов - Информация о блокировках
"""
from django.urls import path
from . import views

urlpatterns = [
    path('info', views.get_ban_info, name='get_ban_info'),
]
