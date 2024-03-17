from django.db import models

from core.models import TimeStampedModel


class Watcher(TimeStampedModel):
    is_active = models.BooleanField(default=True)
    latest = models.JSONField(default=dict)
    name = models.CharField(max_length=255)
    request = models.JSONField(default=dict)
    selector = models.CharField(max_length=128)
    url = models.URLField()

    def __str__(self):
        return self.name
