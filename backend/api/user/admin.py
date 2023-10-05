from django.contrib import admin

from api.user.models import User


class CustomUserAdmin(admin.ModelAdmin):
    list_display = "id", "is_active", "is_staff", "email"


admin.site.register(User, CustomUserAdmin)
