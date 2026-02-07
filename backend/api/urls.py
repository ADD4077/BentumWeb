from django.urls import path
from .views import save_data

urlpatterns = [
    path("api/save_data", save_data),
]
