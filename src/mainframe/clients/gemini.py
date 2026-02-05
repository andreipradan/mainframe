import logging
import re
from pathlib import Path

import environ
import google.api_core.exceptions
from google import genai

logger = logging.getLogger(__name__)

# Constants
GEMINI_MODEL = "gemini-2.5-flash-lite"
MAX_TELEGRAM_LENGTH = 4096
TELEGRAM_TRUNCATE_AT = 3997
SAFETY_CATEGORY = "HARM_CATEGORY_HARASSMENT"
SAFETY_THRESHOLD = "BLOCK_ONLY_HIGH"


class GeminiError(Exception): ...


def format_for_telegram(text: str) -> str:
    """Format text for Telegram HTML parse mode."""
    text = text.replace("**", "")
    text = text.replace("*", "")
    text = re.sub(r"^#+\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"\n{3,}", "\n\n", text)

    if len(text) > MAX_TELEGRAM_LENGTH:
        text = text[:TELEGRAM_TRUNCATE_AT] + "..."

    return text.strip()


def _extract_text_from_history_item(item) -> str:
    """Extract text content from a history item (dict or string)."""
    if isinstance(item, dict):
        if "parts" in item:
            parts = item["parts"]
            if isinstance(parts, str):
                return parts
            if parts and isinstance(parts, list):
                return parts[0]
        elif "text" in item:
            return item["text"]
    return str(item)


def _upload_file(client, file_path: str) -> str:
    """Upload file to Gemini and return file reference. Cleans up on error."""
    try:
        with open(file_path, "rb") as f:
            upload_results = client.files.upload(file=f)
        logger.info("Uploaded file: '%s' -> '%s'", file_path, upload_results.name)
        return upload_results
    except google.api_core.exceptions.GoogleAPIError as e:
        Path(file_path).unlink()
        raise GeminiError(e) from e
    finally:
        Path(file_path).unlink(missing_ok=True)


def _build_contents_list(prompt, history=None) -> str:
    """Build content string from history and current prompt."""
    contents = []

    if history:
        contents.extend(_extract_text_from_history_item(msg) for msg in history)

    if isinstance(prompt, list):
        contents.extend(str(p) for p in prompt if isinstance(p, str))
    else:
        contents.append(prompt)

    return " ".join(contents)


def generate_content(
    prompt: str, history=None, file_path=None, max_output_tokens=1000, temperature=1.0
) -> str:
    config = environ.Env()
    api_key = config("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)

    # Handle file upload if provided
    if file_path:
        file_ref = _upload_file(client, file_path)
        prompt = [prompt, file_ref]

    try:
        contents = _build_contents_list(prompt, history)

        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=contents,
            config={
                "max_output_tokens": max_output_tokens,
                "temperature": temperature,
                "safety_settings": [
                    {
                        "category": SAFETY_CATEGORY,
                        "threshold": SAFETY_THRESHOLD,
                    }
                ],
            },
        )
        return format_for_telegram(response.text)
    except (ValueError, Exception) as e:
        raise GeminiError(e) from e
