import logging

from django.core.management import call_command
from django.db import models
from django.db.models import signals
from django.dispatch import receiver
from huey import crontab
from huey.contrib.djhuey import HUEY, periodic_task, task

from clients.logs import MainframeHandler
from core.models import TimeStampedModel

logger = logging.getLogger(__name__)
logger.addHandler(MainframeHandler())


class Cron(TimeStampedModel):
    command = models.CharField(max_length=512)
    expression = models.CharField(max_length=32)
    is_active = models.BooleanField(default=False)

    class Meta:
        unique_together = ("command", "expression")

    def __repr__(self):
        return f"{self.command} - {self.expression}"


@task()
def schedule_cron(cron: Cron, **kwargs):
    if kwargs:
        logger.info("[%s] schedule_cron got kwargs: %s", cron.command, kwargs)

    def wrapper():
        call_command(cron.command)

    task_name = f"crons.models.{cron.command}"
    if task_name in HUEY._registry._registry:
        task_class = HUEY._registry.string_to_task(task_name)
        HUEY._registry.unregister(task_class)
        logger.info("Unregistered task: %s", cron.command)
    if cron.expression:
        schedule = crontab(*cron.expression.split())
        periodic_task(schedule, name=cron.command)(wrapper)
        logger.info("Scheduled task: %s", cron.command)


@receiver(signals.post_delete, sender=Cron)
def post_delete(sender, instance, **kwargs):
    instance.expression = ""
    schedule_cron(instance)


@receiver(signals.post_save, sender=Cron)
def post_save(sender, instance, **kwargs):
    schedule_cron(instance)
