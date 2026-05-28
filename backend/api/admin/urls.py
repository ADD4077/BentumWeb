"""
URL модуля администратора - Управление администраторами
"""
from django.urls import path
from . import content_sync_views
from . import views

urlpatterns = [
    path('appoint', views.appoint_administrator, name='appoint_administrator'),
    path('remove', views.remove_administrator, name='remove_administrator'),
    path('list', views.get_administrators, name='get_administrators'),
    path('history', views.get_administration_history, name='get_administration_history'),
    path('content-sync-status', content_sync_views.get_content_sync_status, name='get_content_sync_status'),
]
