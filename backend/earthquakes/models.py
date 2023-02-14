from django.db import models


class Earthquake(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    depth = models.FloatField()
    intensity = models.CharField(blank=True, max_length=16, null=True)
    location = models.CharField(max_length=128)
    latitude = models.FloatField()
    longitude = models.FloatField()
    magnitude = models.FloatField()
    timestamp = models.DateTimeField(unique=True)

    def __str__(self):
        return f"{self.timestamp} - {self.magnitude} - {self.location}{f' - {self.intensity}' if self.intensity else ''}"

    @property
    def url(self):
        return f"https://www.google.com/maps/search/{self.latitude},{self.longitude}"
