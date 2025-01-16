import asyncio

import environ
import github
import requests
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from mainframe.clients.chat import send_telegram_message
from mainframe.core.logs import get_default_logger

logger = get_default_logger(__name__)


def get_ngrok_url(name="mainframe"):
    logger.info("Getting ngrok tunnels")
    resp = requests.get("http://localhost:4040/api/tunnels", timeout=5).json()
    for tunnel in resp["tunnels"]:
        if tunnel["name"] == name:
            return tunnel["public_url"]
    return None


def set_github_hook(ngrok_url):
    env = environ.Env()
    g = github.Github(env("GITHUB_ACCESS_TOKEN"))
    hook_config = {
        "name": "web",
        "config": {
            "url": f"{ngrok_url}/hooks/github/",
            "content_type": "json",
            "secret": settings.SECRET_KEY,
        },
        "events": ["workflow_job"],
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
        except requests.exceptions.ConnectionError as e:
            raise CommandError("Failed to get ngrok tunnels. Is ngrok running?") from e
        if not ngrok_url:
            raise CommandError("Tunnel 'mainframe' not found")

        set_github_hook(ngrok_url)
        logger.info("[Hooks] Done")
        asyncio.run(send_telegram_message(text=f"[[ngrok]] up: {ngrok_url}"))
        self.stdout.write(self.style.SUCCESS("[Hooks] Done."))
