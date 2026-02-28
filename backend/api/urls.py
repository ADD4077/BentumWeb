from django.urls import path
from .views import save_data, dashboard, logout, theme, get_schedule, get_literature

urlpatterns = [
    path("api/save_data", save_data),
    path("api/dashboard", dashboard),
    path("api/logout", logout),
    path("api/theme", theme),
    path("api/schedule", get_schedule),
    path("api/literature", get_literature),
]
