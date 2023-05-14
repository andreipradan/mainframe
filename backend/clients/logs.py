import json
import logging
from functools import cached_property
from logging.handlers import MemoryHandler

import environ
import axiom


def parse_value(value):
    try:
        json.dumps(value)
        return value
    except TypeError:
        return ""


def parse_record(record: logging.LogRecord) -> dict:
    return {
        field: parse_value(getattr(record, field, None))
        for field in record.__dict__.keys()
    }


class AxiomHandler(logging.Handler):
    def __init__(self, dataset):
        super().__init__()
        self.dataset = dataset

    @cached_property
    def client(self):
        return axiom.Client(environ.Env()("AXIOM_TOKEN"))

    def emit(self, record: logging.LogRecord) -> None:
        try:
            self.client.ingest_events(self.dataset, [record.__dict__])
        except TypeError:
            self.client.ingest_events(self.dataset, [parse_record(record)])


class ManagementCommandsHandler(MemoryHandler):
    def __init__(self):
        super().__init__(
            capacity=5,
            flushLevel=logging.INFO,
            target=AxiomHandler("management"),
        )


class MainframeHandler(MemoryHandler):
    def __init__(self):
        super().__init__(
            capacity=5,
            flushLevel=logging.INFO,
            target=AxiomHandler("mainframe"),
        )
