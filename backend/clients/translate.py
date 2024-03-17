import logging

import six
from google.api_core.exceptions import GoogleAPICallError
from google.auth.exceptions import DefaultCredentialsError
from google.cloud import translate_v2 as translate
from google.cloud.exceptions import BadRequest

from clients.logs import MainframeHandler

logger = logging.getLogger(__name__)
logger.addHandler(MainframeHandler())


def translate_text(text, source=None, target="en"):  # noqa: PLR0911
    try:
        translate_client = translate.Client()
    except DefaultCredentialsError:
        return "Couldn't authenticate to google cloud"

    if isinstance(text, six.binary_type):
        text = text.decode("utf-8")

    try:
        result = translate_client.translate(
            text, target_language=target, source_language=source, format_="text"
        )
    except (GoogleAPICallError, BadRequest) as e:
        logger.error(e)
        return "Something went wrong. For usage and examples type '/translate help'."

    return (
        "💬 Translation:\n"
        f"Detected source language: {result['detectedSourceLanguage']}"
        f"Translation: {result['translatedText']}"
    )
