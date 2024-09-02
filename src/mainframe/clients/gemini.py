import environ
import google.generativeai as genai


def generate_content(prompt: str, **kwargs):
    config = environ.Env()
    genai.configure(api_key=config("GEMINI_API_KEY"))
    model = genai.GenerativeModel("gemini-pro")
    return model.generate_content(prompt, **kwargs).text.strip()
