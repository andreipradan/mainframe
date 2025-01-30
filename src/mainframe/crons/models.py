import logging

from django.core.management import call_command, get_commands
from django.db import models
from django.db.models import signals
from django.dispatch import receiver

from mainframe.core.logs import capture_command_logs
from mainframe.core.models import TimeStampedModel
from mainframe.core.tasks import schedule_task


class Cron(TimeStampedModel):
    command = models.CharField(max_length=512)
    expression = models.CharField(max_length=32)
    is_active = models.BooleanField(default=False)
    kwargs = models.JSONField(default=dict)
    log_level = models.IntegerField(default=logging.WARNING)
    name = models.CharField(max_length=255, unique=True)

    class Meta:
        unique_together = ("command", "kwargs", "expression")

    def __str__(self):
        display = f"[{self.command}] "
        if self.kwargs:
            display += f" kwargs={self.kwargs}"
        display += f" {self.expression}"
        return display

    def run(self) -> None:
        app = {k: v for k, v in get_commands().items() if "mainframe" in v}[
            self.command
        ]
        logger = logging.getLogger(f"{app}.management.commands.{self.command}")

        with capture_command_logs(logger, self.log_level, span_name=str(self)):
            call_command(self.command, **self.kwargs)


@receiver(signals.post_delete, sender=Cron)
def post_delete(sender, instance: Cron, **kwargs):  # noqa: PYL-W0613
    instance.expression = ""
    schedule_task(instance)


@receiver(signals.post_save, sender=Cron)
def post_save(sender, instance, **kwargs):  # noqa: PYL-W0613
    if getattr(instance, "is_renamed", False):  # set in core/serializers.py update
        instance.expression = ""
    schedule_task(instance)
