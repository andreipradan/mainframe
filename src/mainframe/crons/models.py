import logging

import logfire
from django.core.management import call_command, get_commands
from django.db import models
from django.db.models import signals
from django.dispatch import receiver

from mainframe.core.models import TimeStampedModel
from mainframe.core.tasks import schedule_task


class LogCaptureHandler(logging.Handler):
    def __init__(self, log_level):
        super().__init__()
        self.captured_logs = []
        self.log_level = log_level

    def emit(self, record):
        if record.levelno >= self.log_level:
            self.captured_logs.append(record)


class Cron(TimeStampedModel):
    command = models.CharField(max_length=512)
    expression = models.CharField(max_length=32)
    is_active = models.BooleanField(default=False)
    kwargs = models.JSONField(default=dict)
    log_level = models.IntegerField(default=logging.INFO)
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

        capture_handler = LogCaptureHandler(self.log_level)

        logger.addHandler(capture_handler)
        call_command(self.command, **self.kwargs)
        logger.removeHandler(capture_handler)

        if capture_handler.captured_logs:
            with logfire.span(f"{self}"):
                for log in capture_handler.captured_logs:
                    logging.getLogger("logfire").handle(log)


@receiver(signals.post_delete, sender=Cron)
def post_delete(sender, instance: Cron, **kwargs):  # noqa: PYL-W0613
    instance.expression = ""
    schedule_task(instance)


@receiver(signals.post_save, sender=Cron)
def post_save(sender, instance, **kwargs):  # noqa: PYL-W0613
    if getattr(instance, "is_renamed", False):  # set in core/serializers.py update
        instance.expression = ""
    schedule_task(instance)
