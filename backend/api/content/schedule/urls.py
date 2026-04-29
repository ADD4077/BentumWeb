"""
URL модуля расписания
"""
from django.urls import path
from . import views

urlpatterns = [
    path('', views.get_schedule, name='get_schedule'),
    path('next', views.get_next_schedule_lesson, name='get_next_schedule_lesson'),
    path('next/', views.get_next_schedule_lesson, name='get_next_schedule_lesson_slash'),
]
