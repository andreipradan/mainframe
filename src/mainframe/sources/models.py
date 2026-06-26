from django.db import models

from mainframe.core.models import TimeStampedModel


class SourceQuerySet(models.QuerySet):
    def default(self):
        return self.get(type="local")


class Source(TimeStampedModel):
    TYPES = (
        ("local", "Local"),
        ("regular", "Regular"),
        ("band", "Band"),
    )

    config = models.JSONField(default=dict)
    is_active = models.BooleanField(default=False)
    headers = models.JSONField(default=dict)
    name = models.CharField(max_length=255, unique=True)
    type = models.CharField(
        max_length=10,
        choices=TYPES,
        default="regular",
    )
    url = models.URLField()

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return self.name
