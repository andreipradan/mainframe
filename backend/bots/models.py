from importlib import import_module

from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.utils import timezone


class Bot(models.Model):
    additional_data = models.JSONField(blank=True, default=dict, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    first_name = models.CharField(max_length=32)
    full_name = models.CharField(max_length=32)
    is_external = models.BooleanField(default=False)
    last_called_on = models.DateTimeField(blank=True, null=True)
    last_name = models.CharField(blank=True, max_length=32, null=True)
    telegram_id = models.BigIntegerField()
    token = models.CharField(max_length=64, unique=True)
    updated_at = models.DateTimeField(auto_now=True)
    username = models.CharField(max_length=32)
    webhook = models.URLField(null=True, blank=True)
    webhook_name = models.CharField(blank=True, max_length=32, null=True)
    whitelist = ArrayField(
        models.CharField(max_length=24),
        blank=True,
        default=list,
        size=8,
    )

    def __str__(self):
        return f"{self.full_name} [{self.username}]"

    def call(self, data):
        webhook_module = import_module(f"api.bots.webhooks.{self.webhook_name}")
        webhook_module.call(data, self)
        self.last_called_on = timezone.now()
        self.save()
