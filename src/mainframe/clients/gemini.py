import logging
from pathlib import Path

import environ
import google.api_core.exceptions
import google.generativeai as genai

logger = logging.getLogger(__name__)


class GeminiError(Exception):
    ...


def generate_content(
    prompt: str, history=None, file_path=None, max_output_tokens=1000, temperature=1.0
):
    history = history or []
    config = environ.Env()
    genai.configure(api_key=config("GEMINI_API_KEY"))

    if file_path:
        try:
            upload_results = genai.upload_file(file_path)
        except google.api_core.exceptions.GoogleAPIError as e:
            Path(file_path).unlink()
            raise GeminiError(e) from e

        logger.info("Uploaded file: '%s' -> '%s'", file_path, upload_results.name)
        prompt = [prompt, upload_results]
        Path(file_path).unlink()

    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        generation_config=genai.types.GenerationConfig(
            max_output_tokens=max_output_tokens, temperature=temperature
        ),
        safety_settings="BLOCK_ONLY_HIGH",
    )
    chat = model.start_chat(history=history)
    try:
        return chat.send_message(prompt).text.strip()
    except (ValueError, genai.types.StopCandidateException) as e:
        raise GeminiError(e) from e
