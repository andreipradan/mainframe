from django.core.exceptions import ValidationError
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

    def clean(self):
        if (
            not self.latest
            or not isinstance(self.latest, dict)
            or set(self.latest.keys()) != {"title", "url"}
        ):
            raise ValidationError("latest must have keys {'title', 'url'}")
        if not self.latest["title"] or not isinstance(self.latest["title"], str):
            raise ValidationError("latest['title'] must be a string")
        if not self.latest["url"] or not isinstance(self.latest["url"], str):
            raise ValidationError("latest['url'} must be a string")
        return super().clean()

    def save(self, *args, **kwargs):
        self.clean()
        return super().save(*args, **kwargs)
