import json
import logging
from functools import cached_property

import environ
import logfire
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


class AxiomHandler(logging.Handler):
    def __init__(self, dataset):
        super().__init__()
        self.dataset = dataset
        self.setFormatter(logging.Formatter(fmt=FORMAT))

    @cached_property
    def client(self):
        import axiom

        return axiom.Client(environ.Env()("AXIOM_TOKEN"))

    def emit(self, record: logging.LogRecord) -> None:
        self.format(record)
        if settings.ENV != "prod":
            logging.warning(record.msg)
        else:
            self.client.ingest_events(self.dataset, [parse_record(record)])


class LogfireMainframeHandler(logfire.LogfireLoggingHandler):
    def __init__(self, prefix):
        self.prefix = prefix
        super().__init__()

    def emit(self, record: logging.LogRecord) -> None:
        record.msg = f"[{self.prefix}] {record.msg}"
        return super().emit(record)


class ManagementCommandsHandler(AxiomHandler):
    def __init__(self):
        super().__init__("management")


class MainframeHandler(AxiomHandler):
    def __init__(self):
        super().__init__("mainframe")


def get_default_logger(name, management=False):
    logger = logging.getLogger(name)
    if settings.ENV == "prod":
        logger.addHandler(LogfireMainframeHandler(name.split(".")[-1]))
    elif management:
        logger.addHandler(ManagementCommandsHandler())
    else:
        logger.addHandler(MainframeHandler())
    return logger
