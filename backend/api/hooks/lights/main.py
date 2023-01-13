import logging

import environ
import telegram
from django.views.decorators.csrf import csrf_exempt

from api.hooks.lights import inlines

logging.basicConfig(format="%(asctime)s - %(levelname)s:%(name)s - %(message)s")
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


@csrf_exempt
def lights(request):
    config = environ.Env(WHITELIST=(list, list))
    whitelist = config("LIGHTS_WHITELIST")
    bot = telegram.Bot(config("LIGHTS_TOKEN"))

    json = request.json()
    update = telegram.Update.de_json(json, bot)
    message = update.message

    if update.callback_query:
        data = update.callback_query.data
        if data.startswith("toggle"):
            toggle_components = data.split(" ")
            if not len(toggle_components) == 2:
                logger.error(f"Invalid parameters for toggle: {toggle_components}")
                return ""
            return inlines.toggle(update, data.split(" ")[1])
        method = getattr(inlines, data, None)
        if not method:
            logger.error(f"Unhandled callback: {data}")
            return ""
        return getattr(inlines, data)(update)

    if not message:
        logger.warning("No message")
        return ""

    if message.from_user.username not in whitelist:
        who = message.from_user.username or message.from_user.id
        logging.error(f"Ignoring message from: {who}")
        return ""

    if not hasattr(message, "text") or not message.text:
        logging.warning(f"Got no text")
        return ""

    if not message.text.startswith("/"):
        logger.warning(f"Not a command: {message.text}")
        return ""

    command = message.text[1:]
    if command == "start":
        return inlines.start(update)

    logger.warning(f"Unhandled command: {message.text}")
    return ""
