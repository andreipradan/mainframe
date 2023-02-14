from django.contrib import admin

from earthquakes.models import Earthquake


class EarthquakeAdmin(admin.ModelAdmin):
    list_display = (
        "timestamp",
        "magnitude",
        "location",
        "intensity",
    )


admin.site.register(Earthquake, EarthquakeAdmin)
