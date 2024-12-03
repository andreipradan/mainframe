import logging

import axiom_py
from axiom_py.logging import AxiomHandler
from django.conf import settings


class MainframeHandler(AxiomHandler):
    def emit(self, record: logging.LogRecord) -> None:
        if record.args:
            record.msg = record.msg % record.args
            record.args = []
        record.env = settings.ENV
        super().emit(record)


def get_default_logger(name):
    logger = logging.getLogger(name)
    if settings.ENV in ("prod", "rpi") and not logger.handlers:
        client = axiom_py.Client()
        logger.addHandler(MainframeHandler(client, "mainframe"))
    return logger
