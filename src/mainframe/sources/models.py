from django.db import models
from django.db.models import Q

from mainframe.core.models import TimeStampedModel


class SourceQuerySet(models.QuerySet):
    def default(self):
        return self.get(is_default=True)


class Source(TimeStampedModel):
    config = models.JSONField(default=dict)
    is_default = models.BooleanField(default=False)
    headers = models.JSONField(default=dict)
    name = models.CharField(max_length=255, unique=True)
    url = models.URLField()

    objects = SourceQuerySet.as_manager()

    class Meta:
        ordering = ("name",)
        constraints = [
            models.UniqueConstraint(
                fields=["is_default"],
                condition=Q(is_default=True),
                name="unique_default_source",
            )
        ]

    def __str__(self):
        return self.name
