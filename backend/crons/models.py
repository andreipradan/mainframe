import environ
from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.db import models

from core.models import TimeStampedModel


class Cron(TimeStampedModel):
    command = models.CharField(max_length=128)
    arguments = ArrayField(
        models.CharField(max_length=32),
        blank=True,
        default=list,
        size=8,
    )
    expression = models.CharField(max_length=128)
    is_active = models.BooleanField(default=False)
    description = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ("command", "arguments", "expression")

    def __str__(self):
        return f"{self.command} - {self.expression}"

    @property
    def management_command(self):
        config = environ.Env()
        python_path = config('PYTHON_PATH')
        manage_path = settings.BASE_DIR / "manage.py"
        return f"{python_path} {manage_path} {self.command} {' '.join(self.arguments)}"
