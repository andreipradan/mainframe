import logging
from pathlib import Path

import environ
import github
import requests
from django.conf import settings
from django.core.management.base import BaseCommand

from clients import healthchecks
from clients.cron import set_crons
from clients.chat import send_telegram_message
from core.settings import get_file_handler
from crons.models import Cron

logger = logging.getLogger(__name__)
logger.addHandler(get_file_handler(Path(__file__).stem))


def get_ngrok_url(name="mainframe"):
    logger.info("Getting ngrok tunnels")
    resp = requests.get("http://localhost:4040/api/tunnels").json()
    for tunnel in resp["tunnels"]:
        if tunnel["name"] == name:
            return tunnel["public_url"]
    else:
        logger.warning(f"Tunnel not found: {name}")


def set_github_hook(ngrok_url):
    env = environ.Env()
    g = github.Github(env("GITHUB_ACCESS_TOKEN"))
    hook_config = {
        "name": "web",
        "config": {
            "url": f"{ngrok_url}/api/hooks/github/",
            "content_type": "json",
            "secret": settings.SECRET_KEY,
        },
        "events": ["push"],
        "active": True,
    }
    repository = g.get_repo(f"{env('GITHUB_USERNAME')}/mainframe")
    hooks = repository.get_hooks()

    logger.warning(f"[GitHub] Deleting all hooks [{hooks.totalCount}]")
    for hook in hooks:
        hook.delete()

    return repository.create_hook(**hook_config)


class Command(BaseCommand):
    def handle(self, *args, **options):
        logger.info(f"[Crons] Setting")
        crons = Cron.objects.filter(is_active=True)
        if not crons:
            logger.error("No active crons in the database")
        set_crons(crons, clear_all=True)
        logger.info(f"[Crons] Done")

        healthchecks.ping() and logger.info("[Healthcheck] Done")
        send_telegram_message(f"[[backend]] up")
        self.stdout.write(self.style.SUCCESS("[Crons] Done."))
