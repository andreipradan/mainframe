import environ
import google.generativeai as genai
from mainframe.clients.logs import get_default_logger

logger = get_default_logger(__name__)


class GeminiError(Exception):
    ...


def generate_content(prompt: str, history=None):
    history = history or []
    config = environ.Env()
    genai.configure(api_key=config("GEMINI_API_KEY"))
    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        generation_config=genai.types.GenerationConfig(
            max_output_tokens=1000, temperature=1.0
        ),
        safety_settings="BLOCK_ONLY_HIGH",
    )
    chat = model.start_chat(history=history)
    try:
        return chat.send_message(prompt).text.strip()
    except (ValueError, genai.types.StopCandidateException) as e:
        raise GeminiError(e) from e
