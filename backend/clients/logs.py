import json
import logging
import queue
from functools import cached_property
from logging.handlers import MemoryHandler

import environ
import axiom

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
        field: parse_value(getattr(record, field, None))
        for field in record.__dict__.keys()
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
        return axiom.Client(environ.Env()("AXIOM_TOKEN"))

    def emit(self, record: logging.LogRecord) -> None:
        self.format(record)
        self.client.ingest_events(self.dataset, [parse_record(record)])


class ManagementCommandsHandler(AxiomHandler):
    def __init__(self):
        super().__init__("management")


class MainframeHandler(AxiomHandler):
    def __init__(self):
        super().__init__("mainframe")


def get_logger(name):
    from logging.handlers import QueueHandler, QueueListener

    que = queue.Queue(-1)
    logger = logging.getLogger(name)
    logger.addHandler(QueueHandler(que))
    listener = QueueListener(que, MainframeHandler())
    return logger, listener
