import six
from google.api_core.exceptions import GoogleAPICallError
from google.auth.exceptions import DefaultCredentialsError
from google.cloud import translate_v2
from google.cloud.exceptions import BadRequest
from mainframe.clients.logs import get_default_logger

logger = get_default_logger(__name__)


def translate_text(text, source=None, target="en"):
    try:
        translate_client = translate_v2.Client()
    except DefaultCredentialsError:
        return "Couldn't authenticate to google cloud"

    if isinstance(text, six.binary_type):
        text = text.decode("utf-8")

    default_kwargs = {"target_language": target, "format_": "text"}
    if source:
        default_kwargs["source_language"] = source

    try:
        result = translate_client.translate(text, **default_kwargs)
    except BadRequest as e:
        return "🛑 Bad request:\n" + "\n".join(err["message"] for err in e.errors)
    except GoogleAPICallError as e:
        logger.error(e)
        return "Something went wrong. For usage and examples type '/translate help'."

    msg = f"💬 Translation: {result['translatedText']}"
    if "detectedSourceLanguage" in result:
        msg += f"\nDetected language: {result['detectedSourceLanguage']}"
    return msg
