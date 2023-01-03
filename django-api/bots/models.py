from django.contrib.postgres.fields import ArrayField
from django.db import models


class Bot(models.Model):
    additional_data = models.JSONField(blank=True, default=dict, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=False)
    last_called_on = models.DateTimeField(blank=True, null=True)
    name = models.CharField(max_length=32)
    token = models.CharField(max_length=64, unique=True)
    updated_at = models.DateTimeField(auto_now=True)
    webhook = models.URLField(null=True, blank=True)
    whitelist = ArrayField(
        models.CharField(max_length=24),
        blank=True,
        default=list,
        size=8,
    )

    def __str__(self):
        return f"{self.name} [{'active' if self.is_active else 'inactive'}]"
