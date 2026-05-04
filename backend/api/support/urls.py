"""
URL модуля поддержки - Заявки в поддержку
"""
from django.conf import settings
from django.urls import path
from . import views

urlpatterns = [
    path('', views.submit_support_request, name='submit_support_request'),
    path('submit', views.submit_support_request, name='submit_support_request_alt'),
    path('my/threads', views.get_my_threads, name='my_support_threads'),
    path('my/threads/<int:thread_id>', views.get_my_thread_detail, name='my_support_thread_detail'),
    path('moder/threads', views.get_moder_threads, name='moder_support_threads'),
    path('moder/threads/<int:thread_id>', views.get_moder_thread_detail, name='moder_support_thread_detail'),
    path('moder/threads/<int:thread_id>/reply', views.reply_to_thread, name='moder_support_thread_reply'),
    path('moder/threads/<int:thread_id>/status', views.update_thread_status, name='moder_support_thread_status'),
]

if settings.DEBUG:
    urlpatterns += [
        path('test-telegram', views.test_telegram_connection, name='test_telegram_connection'),
        path('test-notification', views.test_new_user_notification, name='test_new_user_notification'),
        path('notify', views.send_new_user_notification, name='send_new_user_notification'),
    ]
