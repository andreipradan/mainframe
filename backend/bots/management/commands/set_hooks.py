import logging

import environ
import github
import requests
import telegram
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from requests.exceptions import ConnectionError

from bots.models import Bot
from clients.chat import send_telegram_message
from clients.logs import ManagementCommandsHandler

logger = logging.getLogger(__name__)
logger.addHandler(ManagementCommandsHandler())


def get_ngrok_url(name="mainframe"):
    logger.info("Getting ngrok tunnels")
    resp = requests.get("http://localhost:4040/api/tunnels").json()
    for tunnel in resp["tunnels"]:
        if tunnel["name"] == name:
            return tunnel["public_url"]


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
        "events": ["push", "workflow_run"],
        "active": True,
    }
    repository = g.get_repo(f"{env('GITHUB_USERNAME')}/mainframe")
    hooks = repository.get_hooks()

    logger.warning("[GitHub] Deleting all hooks [%d]", hooks.totalCount)
    for hook in hooks:
        hook.delete()

    return repository.create_hook(**hook_config)


class Command(BaseCommand):

    def handle(self, *_, **__):
        try:
            ngrok_url = get_ngrok_url()
        except ConnectionError:
            raise CommandError(
                "Failed to get ngrok tunnels. Is ngrok running?")
        if not ngrok_url:
            raise CommandError("Tunnel 'mainframe' not found")

        set_github_hook(ngrok_url)
        logger.info("[Hooks][GitHub] Done")
        for bot in Bot.objects.filter(is_active=True):
            url = f"{ngrok_url}/api/bots/{bot.id}/webhook/"
            try:
                response = bot.telegram_bot.set_webhook(url)
                logger.info(
                    f"[Hooks][Telegram] {bot.full_name}: {'✅' if response else '❌'}"
                )
            except telegram.error.TelegramError as e:
                logger.error(str(e))
        logger.info("[Hooks] Done")
        send_telegram_message(text=f"[[ngrok]] up: {ngrok_url}")
        self.stdout.write(self.style.SUCCESS("[Hooks] Done."))
