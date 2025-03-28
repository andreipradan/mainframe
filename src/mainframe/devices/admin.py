from django.contrib import admin

from mainframe.devices.models import Device


class DeviceAdmin(admin.ModelAdmin):
    list_display = (
        "ip",
        "name",
        "mac",
    )


admin.site.register(Device, DeviceAdmin)
