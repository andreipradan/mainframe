from django.contrib import admin

from transit_lines.models import TransitLine, Schedule


class ScheduleAdmin(admin.ModelAdmin):
    list_display = ("line", "occurrence")


class TransitLineAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "type",
        "terminal1",
        "terminal2",
    )


admin.site.register(Schedule, ScheduleAdmin)
admin.site.register(TransitLine, TransitLineAdmin)
