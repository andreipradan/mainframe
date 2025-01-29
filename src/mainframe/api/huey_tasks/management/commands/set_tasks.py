import asyncio

from django.core.management import BaseCommand

from mainframe.clients.chat import send_telegram_message
from mainframe.core.tasks import schedule_task
from mainframe.crons.models import Cron
from mainframe.watchers.models import Watcher


class Command(BaseCommand):
    def handle(self, *_, **options):
        for cron in Cron.objects.filter(is_active=True):
            schedule_task(cron)

        for watcher in Watcher.objects.filter(is_active=True):
            schedule_task(watcher)
        asyncio.run(send_telegram_message(text="[[huey]] up"))
