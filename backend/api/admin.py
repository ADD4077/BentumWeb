from django.contrib import admin
from api.models import (
    User,
    UserSession,
    UserProfileMedia,
    MediaOptimization,
    Administration,
    UserBan,
)


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    exclude = ["created_at", "last_login", "last_login_ip"]


admin.site.register(UserSession)
admin.site.register(UserProfileMedia)
admin.site.register(MediaOptimization)
admin.site.register(Administration)
admin.site.register(UserBan)
