"""
URL модуля профиля - Управление профилем пользователя
"""
from django.urls import path
from . import views

urlpatterns = [
    path('', views.update_profile, name='update_profile'),
    path('update', views.update_profile, name='update_profile_alt'),
    path('avatar', views.update_avatar, name='update_avatar'),
    path('banner', views.update_banner, name='update_banner'),
    path('password', views.change_password, name='change_password'),
]
