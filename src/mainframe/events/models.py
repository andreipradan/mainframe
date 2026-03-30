from django.contrib.postgres.fields import ArrayField
from django.db import models

from mainframe.core.models import TimeStampedModel


class Event(TimeStampedModel):
    source = models.ForeignKey("sources.Source", on_delete=models.CASCADE)

    title = models.CharField(max_length=256)

    categories = ArrayField(models.CharField(max_length=64), default=list)
    location = models.CharField(max_length=100)
    start_date = models.DateTimeField()
    url = models.URLField(unique=True)

    additional_data = models.JSONField(blank=True, default=dict)
    city = models.CharField(blank=True, max_length=64)
    description = models.TextField(blank=True)
    end_date = models.DateTimeField(blank=True, null=True)
    external_id = models.CharField(blank=True, max_length=100)
    location_url = models.URLField(blank=True)

    class Meta:
        ordering = ["start_date"]

    def __str__(self):
        return self.title
