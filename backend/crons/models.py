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
        lock_name = self.command.replace(" ", "_").replace("-", "_")
        flock = f"/usr/bin/flock -n /tmp/{lock_name}.lockfile"
        manage_path = settings.BASE_DIR / "manage.py"
        return f"{flock} {settings.PYTHON_PATH} {manage_path} {self.command}"

    @classmethod
    def unparse(cls, cmd):
        manage_path = str(settings.BASE_DIR / "manage.py")
        if ".lockfile " in cmd:
            cmd = cmd.split(".lockfile ")[1]
        if manage_path in cmd:
            cmd = cmd.replace(f"{settings.PYTHON_PATH} {manage_path} ", "")
        return cmd.strip()
