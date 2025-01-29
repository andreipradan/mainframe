import logging

import logfire
from django.core.management import call_command
from django.db import models
from django.db.models import signals
from django.dispatch import receiver

from mainframe.core.models import TimeStampedModel
from mainframe.core.tasks import schedule_task


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
        logger = logging.getLogger("mainframe")
        all_handlers = logger.handlers[:]
        logfire_handler = next((h for h in all_handlers if h.name == "logfire"), None)
        if not logfire_handler:
            logger.warning("Logfire handler missing")
            call_command(self.command, **self.kwargs)
            return

        logger.handlers.clear()
        logger.handlers = [h for h in all_handlers if h != logfire_handler]

        capture_handler = LogCaptureHandler()
        logger.addHandler(capture_handler)

        try:
            call_command(self.command, **self.kwargs)
        finally:
            logs = [
                log
                for log in capture_handler.captured_logs
                if log.levelno >= self.log_level
            ]
            if not logs:
                logger.info("No captured logs")
            else:
                with logfire.span(f"{self}"):
                    for log in logs:
                        logfire_handler.handle(log)

            logger.handlers.clear()
            logger.handlers = [h for h in logger.handlers if h != capture_handler]
            logger.handlers.append(logfire_handler)


@receiver(signals.post_delete, sender=Cron)
def post_delete(sender, instance: Cron, **kwargs):  # noqa: PYL-W0613
    instance.expression = ""
    schedule_task(instance)


@receiver(signals.post_save, sender=Cron)
def post_save(sender, instance, **kwargs):  # noqa: PYL-W0613
    if getattr(instance, "is_renamed", False):  # set in core/serializers.py update
        instance.expression = ""
    schedule_task(instance)
