import logging

import environ
import github
import requests
import telegram
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from requests.exceptions import ConnectionError

from bots.models import Bot

logger = logging.getLogger(__name__)


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

    logger.warning(f"Deleting all hooks [{hooks.totalCount}]")
    for hook in hooks:
        hook.delete()

    hook = repository.create_hook(**hook_config)
    logger.info(f"Github web hook created successfully: {hook}")


def set_telegram_hooks(ngrok_url):
    logger.info("Setting telegram webhooks")
    for bot in Bot.objects.filter(is_active=True):
        try:
            logger.info(
                f"{bot.full_name}: {bot.telegram_bot.set_webhook(f'{ngrok_url}/api/bots/{bot.id}/webhook/')}"
            )
        except telegram.error.TelegramError as e:
            raise CommandError(str(e))


class Command(BaseCommand):
    def handle(self, *args, **options):
        env = environ.Env()
        ngrok_url = get_ngrok_url()
        set_github_hook(ngrok_url, env("GITHUB_ACCESS_TOKEN"), env("GITHUB_USERNAME"))
        set_telegram_hooks(ngrok_url)
        self.stdout.write(self.style.SUCCESS("Done."))
