from django.urls import path
from .views import save_data, dashboard, logout, theme, get_schedule

urlpatterns = [
    path("api/save_data", save_data),
    path("api/dashboard", dashboard),
    path("api/logout", logout),
    path("api/theme", theme),
    path("api/schedule", get_schedule),
]
