from django.contrib import admin

from crons.models import Cron


class CronAdmin(admin.ModelAdmin):
    list_display = (
        "command",
        "expression",
        "is_active",
    )


admin.site.register(Cron, CronAdmin)
