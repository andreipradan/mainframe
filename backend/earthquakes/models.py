from django.db import models


class Earthquake(models.Model):
    SOURCE_INFP = "infp"
    SOURCE_USGS = "usgs"

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    depth = models.FloatField()
    intensity = models.CharField(blank=True, max_length=16, null=True)
    location = models.CharField(max_length=128)
    latitude = models.FloatField()
    longitude = models.FloatField()
    magnitude = models.FloatField()
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

    def __str__(self):
        return f"{self.timestamp} - {self.magnitude} - {self.location}{f' - {self.intensity}' if self.intensity else ''}"

    @property
    def url(self):
        return f"https://www.google.com/maps/search/{self.latitude},{self.longitude}"
