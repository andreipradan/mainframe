from django.contrib import admin

from transit_lines.models import Schedule, TransitLine


class ScheduleAdmin(admin.ModelAdmin):
    list_display = ("line", "occurrence")


class TransitLineAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "car_type",
        "line_type",
        "terminal1",
        "terminal2",
    )


admin.site.register(Schedule, ScheduleAdmin)
admin.site.register(TransitLine, TransitLineAdmin)
