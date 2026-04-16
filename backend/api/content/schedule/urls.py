"""
URL модуля расписания
"""
from django.urls import path
from . import views

urlpatterns = [
    path('', views.get_schedule, name='get_schedule'),
]
