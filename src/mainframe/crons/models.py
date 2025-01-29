import logging

import logfire
from django.core.management import call_command
from django.db import models
from django.db.models import signals
from django.dispatch import receiver
from mainframe.core.logs import get_default_logger
from mainframe.core.models import TimeStampedModel
from mainframe.core.tasks import schedule_task

logger = get_default_logger(__name__)


class LogCaptureHandler(logging.Handler):
    def __init__(self):
        super().__init__()
        self.captured_logs = []

    def emit(self, record):
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
        handler = LogCaptureHandler()

        mainframe_logger = logging.getLogger("mainframe")
        original_handlers = mainframe_logger.handlers[:]
        original_level = mainframe_logger.getEffectiveLevel()

        mainframe_logger.handlers.clear()
        mainframe_logger.addHandler(handler)

        mainframe_logger.setLevel(self.log_level)

        try:
            call_command(self.command, **self.kwargs)
        finally:
            mainframe_logger.handlers.clear()
            mainframe_logger.handlers.extend(original_handlers)
            if handler.captured_logs:
                with logfire.span(f"{self}"):
                    for log in handler.captured_logs:
                        mainframe_logger.log(level=log.levelno, msg=log.getMessage())

            mainframe_logger.setLevel(original_level)


@receiver(signals.post_delete, sender=Cron)
def post_delete(sender, instance: Cron, **kwargs):  # noqa: PYL-W0613
    instance.expression = ""
    schedule_task(instance)


@receiver(signals.post_save, sender=Cron)
def post_save(sender, instance, **kwargs):  # noqa: PYL-W0613
    if getattr(instance, "is_renamed", False):  # set in core/serializers.py update
        instance.expression = ""
    schedule_task(instance)
