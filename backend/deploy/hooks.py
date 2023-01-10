import logging

import environ
import github
import requests
import telegram
from django.conf import settings
from requests.exceptions import ConnectionError

from bots.models import Bot

logging.basicConfig(format="%(asctime)s - %(levelname)s:%(name)s - %(message)s")
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


def get_ngrok_url():
    try:
        resp = requests.get("http://localhost:4040/api/tunnels").json()
    except ConnectionError:
        raise ConnectionError("Failed to get ngrok tunnels. Is ngrok running?")

    for tunnel in resp["tunnels"]:
        url = tunnel["public_url"]
        if url.startswith("https://"):
            logger.info(f"Got ngrok URL: {url}")
            return url

    raise LookupError("Tunnel URL not found")


def set_hooks():
    env = environ.Env()

    ngrok_url = get_ngrok_url()

    g = github.Github(env("GITHUB_ACCESS_TOKEN"),)
    hook_config = {
        "name": "web",
        "config": {
            "url": f"{ngrok_url}/api/hooks/github/mainframe/",
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
    for bot in Bot.objects.filter(is_external=False):
        if bot.webhook:
            logger.debug(f"{bot.full_name}: {telegram.Bot(bot.token).set_webhook(bot.webhook)}")


if __name__ == "__main__":
    set_hooks()
