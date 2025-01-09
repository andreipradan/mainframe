from django.db import models
from django.utils import timezone
from mainframe.core.models import TimeStampedModel


class Device(TimeStampedModel):
    additional_data = models.JSONField(default=dict)
    alias = models.CharField(blank=True, max_length=32)
    ip = models.GenericIPAddressField(blank=True, null=True)
    is_active = models.BooleanField(default=False)
    last_seen = models.DateTimeField(default=timezone.now)
    mac = models.CharField(max_length=24, unique=True)
    name = models.CharField(blank=True, max_length=32)
    should_notify_presence = models.BooleanField(default=True)

    def __repr__(self):
        return self.alias or self.name or self.ip or self.mac

    def save(self, **kwargs):
        self.mac = self.mac.upper()
        return super().save(**kwargs)
