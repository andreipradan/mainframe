from django.db import models


class Device(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    ip = models.GenericIPAddressField()
    is_active = models.BooleanField(default=False)
    mac = models.CharField(max_length=24, unique=True)
    name = models.CharField(blank=True, max_length=32, null=True)

    def __str__(self):
        return f"{self.name}{' ' if self.name else ''}{self.ip}"
