from django.core.management import call_command
from django.db import models
from django.db.models import signals
from django.dispatch import receiver
from mainframe.clients.logs import get_default_logger
from mainframe.core.models import TimeStampedModel
from mainframe.core.tasks import schedule_task
from opentelemetry import trace

logger = get_default_logger(__name__)
tracer = trace.get_tracer(__name__)


class Cron(TimeStampedModel):
    args = models.JSONField(default=list)
    command = models.CharField(max_length=512)
    expression = models.CharField(max_length=32)
    is_active = models.BooleanField(default=False)
    kwargs = models.JSONField(default=dict)
    name = models.CharField(max_length=255, unique=True)

    class Meta:
        unique_together = ("command", "args", "kwargs", "expression")

    def __str__(self):
        display = f"[{self.command}] "
        if self.args:
            display += f" args={self.args}"
        if self.kwargs:
            display += f" kwargs={self.kwargs}"
        display += f" {self.expression}"
        return display

    def run(self):
        with tracer.start_as_current_span(self):
            if not isinstance(self.args, list):
                return call_command(self.command, **self.kwargs)
            return call_command(self.command, *self.args, **self.kwargs)


@receiver(signals.post_delete, sender=Cron)
def post_delete(sender, instance: Cron, **kwargs):  # noqa: PYL-W0613
    instance.expression = ""
    schedule_task(instance)


@receiver(signals.post_save, sender=Cron)
def post_save(sender, instance, **kwargs):  # noqa: PYL-W0613
    if getattr(instance, "is_renamed", False):  # set in core/serializers.py update
        instance.expression = ""
    schedule_task(instance)
