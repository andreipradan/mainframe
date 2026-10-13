from django.core.management import call_command
from django.db import models
from django.db.models import signals
from django.dispatch import receiver

from mainframe.core.models import TimeStampedModel
from mainframe.core.tasks import schedule_task


class Cron(TimeStampedModel):
    command = models.CharField(max_length=512)
    expression = models.CharField(max_length=32)
    is_active = models.BooleanField(default=False)
    kwargs = models.JSONField(default=dict)
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
        call_command(self.command, **self.kwargs)


@receiver(signals.pre_save, sender=Cron)
def pre_save(sender, instance, **kwargs):  # noqa: F841
    if instance._state.adding:
        instance._previous_task_name = None
        return

    instance._previous_task_name = (
        sender.objects.filter(pk=instance.pk).values_list("name", flat=True).first()
    )


@receiver(signals.post_delete, sender=Cron)
def post_delete(sender, instance: Cron, **kwargs):  # noqa: F841
    instance.expression = ""
    schedule_task(instance)


@receiver(signals.post_save, sender=Cron)
def post_save(sender, instance, **kwargs):  # noqa: F841
    previous_name = getattr(instance, "_previous_task_name", None)
    if previous_name and previous_name != instance.name:
        schedule_task(instance, previous_name=previous_name)
    else:
        schedule_task(instance)
