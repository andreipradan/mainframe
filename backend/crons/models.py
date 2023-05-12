from django.db import models

from core.models import TimeStampedModel


class Cron(TimeStampedModel):
    command = models.CharField(max_length=512)
    expression = models.CharField(max_length=32)
    is_active = models.BooleanField(default=False)
    is_management = models.BooleanField(default=False)
    description = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ("command", "expression")

    def __str__(self):
        return f"{self.command} - {self.expression}"
