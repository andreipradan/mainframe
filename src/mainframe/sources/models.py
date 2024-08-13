from django.db import models
from mainframe.core.models import TimeStampedModel


class Source(TimeStampedModel):
    config = models.JSONField(default=dict)
    headers = models.JSONField(default=dict)
    name = models.CharField(max_length=255, unique=True)
    url = models.URLField()

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return self.name
