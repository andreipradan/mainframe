from django.contrib import admin
from mainframe.earthquakes.models import Earthquake


class EarthquakeAdmin(admin.ModelAdmin):
    list_display = (
        "timestamp",
        "magnitude",
        "location",
        "intensity",
    )


admin.site.register(Earthquake, EarthquakeAdmin)
