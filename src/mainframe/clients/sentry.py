import re

_TELEGRAM_TOKEN_URL_PATTERN = re.compile(
    r"(https?://api\.telegram\.org/bot)[^/]+",
)


def redact_telegram_token_from_breadcrumb(breadcrumb, _hint):
    data = breadcrumb.get("data")
    if isinstance(data, dict):
        url = data.get("url")
        if isinstance(url, str):
            data["url"] = _TELEGRAM_TOKEN_URL_PATTERN.sub(r"\1[REDACTED]", url)

    message = breadcrumb.get("message")
    if isinstance(message, str):
        breadcrumb["message"] = _TELEGRAM_TOKEN_URL_PATTERN.sub(
            r"\1[REDACTED]", message
        )

    return breadcrumb
