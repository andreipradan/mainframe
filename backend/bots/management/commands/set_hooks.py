import logging
from urllib.parse import urlparse

import environ
import github
import requests
import telegram
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from requests.exceptions import ConnectionError

from bots.models import Bot

logging.basicConfig(format="%(asctime)s - %(levelname)s:%(name)s - %(message)s")
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


def get_ngrok_url():
    logger.info("Getting ngrok tunnels")
    try:
        resp = requests.get("http://localhost:4040/api/tunnels").json()
    except ConnectionError:
        raise CommandError("Failed to get ngrok tunnels. Is ngrok running?")

    for tunnel in resp["tunnels"]:
        url = tunnel["public_url"]
        if url.startswith("https://"):
            logger.info(f"Got ngrok URL: {url}")
            return url

    raise LookupError("Tunnel URL not found")


class Command(BaseCommand):
    def handle(self, *args, **options):
        env = environ.Env()

        ngrok_url = get_ngrok_url()

        g = github.Github(
            env("GITHUB_ACCESS_TOKEN"),
        )
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

        logger.warning(f"Deleting all hooks [{hooks.totalCount}]")
        for hook in hooks:
            hook.delete()

        hook = repository.create_hook(**hook_config)
        logger.info(f"Github web hook created successfully: {hook}")

        logger.info("Setting telegram webhooks")
        local_bots = list(Bot.objects.filter(is_external=False))
        for bot in local_bots:
            if bot.webhook:
                path = urlparse(bot.webhook).path
                try:
                    logger.debug(
                        f"{bot.full_name}: {telegram.Bot(bot.token).set_webhook(f'{ngrok_url}{path}')}"
                    )
                except telegram.error.TelegramError as e:
                    raise CommandError(str(e))

        self.stdout.write(self.style.SUCCESS("Done."))
