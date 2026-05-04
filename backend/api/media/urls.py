"""
Маршруты модуля медиа.
"""
from django.urls import path
from . import views

urlpatterns = [
    path('', views.get_user_media_by_id, name='get_user_media_by_id'),
    path('upload', views.upload_media, name='upload_media'),
    path('set-active', views.set_active_media, name='set_active_media'),
    path('list', views.get_user_media, name='get_user_media'),
    path('by-id', views.get_user_media_by_id, name='get_user_media_by_id_alt'),
    path('delete', views.delete_media_by_type, name='delete_media'),
    path('delete/<int:media_id>', views.delete_media, name='delete_media_by_id'),
    path('delete-by-type', views.delete_media_by_type, name='delete_media_by_type_alt'),
]
