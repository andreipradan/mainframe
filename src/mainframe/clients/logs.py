import logging

import axiom_py
from axiom_py.logging import AxiomHandler
from django.conf import settings

FORMAT = "%(asctime)s - %(levelname)s - %(module)s.%(name)s - %(msg)s"
logging.basicConfig(format=FORMAT, level=logging.INFO)


class MainframeHandler(AxiomHandler):
    def emit(self, record: logging.LogRecord) -> None:
        record.message = record.msg % record.args
        record.env = settings.ENV
        super().emit(record)


def get_default_logger(name):
    logger = logging.getLogger(name)
    if settings.ENV in ("local",) and not logger.handlers:
        client = axiom_py.Client()
        logger.addHandler(MainframeHandler(client, "mainframe"))
    return logger
