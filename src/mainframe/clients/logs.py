import json
import logging

import logfire

# from django.conf import settings

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


class LogfireHandler(logfire.LogfireLoggingHandler):
    def __init__(self, prefix):
        self.prefix = prefix
        super().__init__()

    def emit(self, record: logging.LogRecord) -> None:
        record.msg = f"[{self.prefix}] {record.msg}"
        return super().emit(record)


def get_default_logger(name):
    logger = logging.getLogger(name)
    # if settings.ENV in ("prod", "rpi") and not logger.handlers:
    #     logger.addHandler(LogfireHandler(name.split(".")[-1]))
    return logger
