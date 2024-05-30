from django.core.exceptions import ImproperlyConfigured
from django.core.management import CommandError, call_command
from django.db import models
from django.db.models import signals
from django.dispatch import receiver
from mainframe.clients.logs import get_default_logger
from mainframe.core.models import TimeStampedModel
from mainframe.core.tasks import schedule_task

logger = get_default_logger(__name__)


class Cron(TimeStampedModel):
    args = models.JSONField(default=list)
    command = models.CharField(max_length=512)
    expression = models.CharField(max_length=32)
    is_active = models.BooleanField(default=False)

    class Meta:
        unique_together = ("command", "expression")

    def __repr__(self):
        return f"{self.command} - {self.expression}"

    def run(self):
        command, *args = self.command.split()
        args = {arg.split("=")[0].replace("--", ""): arg.split("=")[1] for arg in args}
        try:
            call_command(command, **args)
        except (CommandError, ImproperlyConfigured, KeyError, TypeError) as e:
            logger.exception(e)


@receiver(signals.post_delete, sender=Cron)
def post_delete(sender, instance: Cron, **kwargs):
    instance.expression = ""
    schedule_task(instance)


@receiver(signals.post_save, sender=Cron)
def post_save(sender, instance, **kwargs):
    schedule_task(instance)
