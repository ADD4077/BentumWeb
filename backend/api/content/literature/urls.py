"""
URL модуля литературы
"""
from django.urls import path
from . import views

urlpatterns = [
    path('', views.get_literature, name='get_literature'),
]
