from django.db import models

from mainframe.core.models import TimeStampedModel
from mainframe.events.constants import CATEGORY_CHOICES


class Event(TimeStampedModel):
    source = models.ForeignKey("sources.Source", on_delete=models.CASCADE)

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField(null=True, blank=True)
    location = models.CharField(max_length=255, blank=True)
    location_slug = models.CharField(max_length=255, blank=True)
    city_name = models.CharField(max_length=255, blank=True)
    city_slug = models.CharField(max_length=255, blank=True)
    category_id = models.IntegerField(
        choices=CATEGORY_CHOICES,
        default=4,  # "Other"
        db_index=True,
    )
    url = models.URLField(blank=True)
    external_id = models.CharField(max_length=100)
    additional_data = models.JSONField(blank=True, default=dict)

    class Meta:
        ordering = ["start_date"]
        constraints = [
            models.UniqueConstraint(
                fields=["source", "external_id"], name="unique_source_external_id"
            ),
        ]

    def __str__(self):
        return self.title
