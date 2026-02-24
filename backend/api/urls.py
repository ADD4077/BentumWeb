from django.urls import path
from .views import save_data, dashboard, logout, theme

urlpatterns = [
    path("api/save_data", save_data),
    path("api/dashboard", dashboard),
    path("api/logout", logout),
    path("api/theme", theme),
]
