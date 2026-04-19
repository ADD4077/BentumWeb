"""
URL модуля поддержки - Заявки в поддержку
"""
from django.conf import settings
from django.urls import path
from . import views

urlpatterns = [
    path('', views.submit_support_request, name='submit_support_request'),
    path('submit', views.submit_support_request, name='submit_support_request_alt'),
]

if settings.DEBUG:
    urlpatterns += [
        path('test-telegram', views.test_telegram_connection, name='test_telegram_connection'),
        path('test-notification', views.test_new_user_notification, name='test_new_user_notification'),
        path('notify', views.send_new_user_notification, name='send_new_user_notification'),
    ]
