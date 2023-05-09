import logging
from pathlib import Path

import environ
import github
import requests
import telegram
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from requests.exceptions import ConnectionError

from bots.models import Bot
from clients import healthchecks
from clients.cron import set_crons
from clients.telegram import send_telegram_message
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


def set_github_hook(ngrok_url, access_token, username):
    g = github.Github(access_token)
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
    repository = g.get_repo(f"{username}/mainframe")
    hooks = repository.get_hooks()

    logger.warning(f"[GitHub] Deleting all hooks [{hooks.totalCount}]")
    for hook in hooks:
        hook.delete()

    return repository.create_hook(**hook_config)


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("--service", type=str, required=True)

    def handle(self, *args, **options):
        service = options["service"]
        if service == "backend":
            logger.info(f"[Crons] Setting")
            crons = Cron.objects.filter(is_active=True)
            if not crons:
                logger.error("No active crons in the database")
            set_crons(crons, clear_all=True)
            logger.info(f"[Crons] Done")

            healthchecks.ping() and logger.info("[Healthcheck] Done")
        elif service == "ngrok":
            env = environ.Env()
            try:
                ngrok_url = get_ngrok_url()
            except ConnectionError:
                raise CommandError("Failed to get ngrok tunnels. Is ngrok running?")
            if not ngrok_url:
                raise CommandError("Tunnel 'mainframe' not found")

            logger.info(f"[GitHub] Setting hook")
            hook = set_github_hook(
                ngrok_url, env("GITHUB_ACCESS_TOKEN"), env("GITHUB_USERNAME")
            )
            logger.info(f"[GitHub] Web hook created successfully: {hook}")

            logger.info("[Telegram] Setting hooks")
            for bot in Bot.objects.filter(is_active=True):
                try:
                    response = bot.telegram_bot.set_webhook(
                        f"{ngrok_url}/api/bots/{bot.id}/webhook/"
                    )
                    logger.info(f"{bot.full_name}: {response}")
                except telegram.error.TelegramError as e:
                    logger.error(str(e))
            logger.info("[Telegram hooks] Done")
            send_telegram_message(ngrok_url)
        else:
            logger.error(f"Invalid service: {service}")

        send_telegram_message(f"[[{service}]] up")
        self.stdout.write(self.style.SUCCESS("[post-deploy] Done."))
