from django.db import models


class Device(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    ip = models.GenericIPAddressField()
    mac = models.CharField(max_length=24, unique=True)
    name = models.CharField(max_length=32)

    def __str__(self):
        return f"{self.name}{' ' if self.name else ''}{self.ip}"
