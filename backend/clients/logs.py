import logging
from logging.handlers import MemoryHandler

import environ
import axiom


class AxiomHandler(logging.Handler):
    def __init__(self, dataset):
        super().__init__()
        self.client = axiom.Client(environ.Env()("AXIOM_TOKEN"))
        self.dataset = dataset

    def emit(self, record: logging.LogRecord) -> None:
        self.client.ingest_events(self.dataset, [record.__dict__])


def get_handler(dataset):
    return MemoryHandler(
        capacity=5,
        flushLevel=logging.INFO,
        target=AxiomHandler(dataset),
    )
