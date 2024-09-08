from django.contrib import admin
from mainframe.bots.models import Bot


class BotAdmin(admin.ModelAdmin):
    list_display = (
        "full_name",
        "username",
        "whitelist",
        "last_called_on",
        "webhook",
        "telegram_id",
        "created_at",
        "updated_at",
    )


admin.site.register(Bot, BotAdmin)
