from django.conf import settings
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

    def __repr__(self):
        return f"{self.command} - {self.expression}"

    @property
    def management_command(self):
        flock = f"/usr/bin/flock -n /tmp/{self.__repr__()}.lockfile"
        manage_path = settings.BASE_DIR / "manage.py"
        return f"{flock} {settings.PYTHON_PATH} {manage_path} {self.command}"
