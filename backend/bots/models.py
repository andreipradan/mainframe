from functools import cached_property
from importlib import import_module

import telegram
from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.utils import timezone

from core.models import TimeStampedModel


class Bot(TimeStampedModel):
    additional_data = models.JSONField(blank=True, default=dict, null=True)
    first_name = models.CharField(max_length=32)
    full_name = models.CharField(max_length=32)
    is_active = models.BooleanField(default=False)
    last_called_on = models.DateTimeField(blank=True, null=True)
    last_name = models.CharField(blank=True, max_length=32, null=True)
    telegram_id = models.BigIntegerField()
    token = models.CharField(max_length=64, unique=True)
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

    @cached_property
    def telegram_bot(self):
        return telegram.Bot(self.token)

    def call(self, data):
        webhook_module = import_module(f"bots.webhooks.{self.webhook_name}")
        webhook_module.call(data, self)
        self.last_called_on = timezone.now()
        self.save()

    def send_message(self, chat_id, text, **kwargs):
        return self.telegram_bot.send_message(chat_id=chat_id, text=text, **kwargs)


class Message(TimeStampedModel):
    additional_data = models.JSONField(blank=True, default=dict, null=True)
    author = models.JSONField()
    chat_id = models.BigIntegerField()
    chat_title = models.CharField(max_length=128)
    date = models.DateTimeField()
    message_id = models.IntegerField()
    saved_by = models.JSONField()
    text = models.CharField(blank=True, max_length=255, null=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"{self.date} {self.chat_id} {self.chat_title}"
