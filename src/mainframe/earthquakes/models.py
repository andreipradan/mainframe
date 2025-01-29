from django.db import models

from mainframe.core.models import TimeStampedModel


class Earthquake(TimeStampedModel):
    SOURCE_INFP = "infp"
    SOURCE_USGS = "usgs"

    additional_data = models.JSONField(blank=True, default=dict, null=True)
    depth = models.DecimalField(decimal_places=3, max_digits=7)
    intensity = models.CharField(max_length=16, default="")
    location = models.CharField(max_length=128)
    latitude = models.DecimalField(decimal_places=5, max_digits=8)
    longitude = models.DecimalField(decimal_places=5, max_digits=8)
    magnitude = models.DecimalField(decimal_places=2, max_digits=4)
    source = models.CharField(
        max_length=5,
        choices=(
            (
                SOURCE_INFP,
                "Institutul Naţional de Cercetare-Dezvoltare pentru Fizica Pământului",
            ),
            (SOURCE_USGS, "United States Geological Survey"),
        ),
    )
    timestamp = models.DateTimeField(unique=True)

    class Meta:
        indexes = (
            models.Index(fields=["source", "-timestamp"], name="source_timestamp_idx"),
        )
        ordering = ("-timestamp",)

    def __str__(self):
        return (
            f"{self.timestamp} - {self.magnitude} - {self.location}"
            f"{f' - {self.intensity}' if self.intensity else ''}"
        )

    @property
    def url(self):
        return f"https://www.google.com/maps/search/{self.latitude},{self.longitude}"
