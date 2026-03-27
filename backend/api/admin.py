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
    list_display = ["fullname", "created_at"]


admin.site.register(UserSession)
admin.site.register(UserProfileMedia)
admin.site.register(MediaOptimization)
admin.site.register(Administration)
admin.site.register(UserBan)
