from django.db import models
from mainframe.core.models import TimeStampedModel


class Device(TimeStampedModel):
    ip = models.GenericIPAddressField()
    is_active = models.BooleanField(default=False)
    mac = models.CharField(max_length=24, unique=True)
    name = models.CharField(blank=True, max_length=32)

    def __str__(self):
        return f"{self.name}{' ' if self.name else ''}{self.ip}"

    def save(self, **kwargs):
        self.mac = self.mac.lower()
        return super().save(**kwargs)
