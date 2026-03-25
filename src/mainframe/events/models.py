from django.db import models

from mainframe.core.models import TimeStampedModel


class Event(TimeStampedModel):
    class SourceChoices(models.TextChoices):
        EB = "eb", "EB"
        OTHER = "other", "Other"

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField(null=True, blank=True)
    location = models.CharField(max_length=255, blank=True)
    location_slug = models.CharField(max_length=255, blank=True)
    city_name = models.CharField(max_length=255, blank=True)
    city_slug = models.CharField(max_length=255, blank=True)
    url = models.URLField(blank=True)
    source = models.CharField(max_length=50, choices=SourceChoices.choices)
    external_id = models.CharField(max_length=100)
    additional_data = models.JSONField(blank=True, default=dict)

    class Meta:
        ordering = ["-start_date"]
        constraints = [
            models.UniqueConstraint(
                fields=["source", "external_id"], name="unique_source_external_id"
            ),
        ]

    def __str__(self):
        return self.title
