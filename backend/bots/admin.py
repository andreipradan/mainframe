from django.contrib import admin

from .models import Bot


class BotAdmin(admin.ModelAdmin):
    list_display = (
        "full_name",
        "username",
        "telegram_id",
        "webhook",
        "whitelist",
        "last_called_on",
    )


admin.site.register(Bot, BotAdmin)
