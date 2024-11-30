import json
import logging

import axiom_py
from axiom_py.logging import AxiomHandler
from django.conf import settings

FORMAT = "%(asctime)s - %(levelname)s - %(module)s.%(name)s - %(msg)s"
logging.basicConfig(format=FORMAT, level=logging.INFO)


def parse_value(value):
    try:
        json.dumps(value)
        return value
    except TypeError:
        return ""


def parse_record(record: logging.LogRecord) -> dict:
    record = {
        field: parse_value(getattr(record, field, None)) for field in record.__dict__
    }
    record["message"] = f"[Mainframe] {record['message']}"
    return record


def get_default_logger(name):
    logger = logging.getLogger(name)
    if settings.ENV in ("prod", "rpi") and not logger.handlers:
        client = axiom_py.Client()
        logger.addHandler(AxiomHandler(client, "mainframe"))
    return logger
