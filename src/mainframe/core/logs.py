import logging

from django.conf import settings
from logtail.handler import LogtailHandler


class ExtraContextFilter(logging.Filter):
    def __init__(self, extra_context=None):
        super().__init__()
        self.extra_context = extra_context or {}

    def filter(self, record):
        for key, value in self.extra_context.items():
            setattr(record, key, value)
        return True


def get_default_logger(name):
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    logger.handlers.clear()

    handler = LogtailHandler(source_token=settings.LOGTAIL_SOURCE_TOKEN)
    context = {"env": settings.ENV}
    logger.addHandler(handler)
    logger.addFilter(ExtraContextFilter(extra_context=context))

    django_logger = logging.getLogger("django.server")
    if not django_logger.handlers:
        django_logger.addHandler(handler)
        django_logger.addFilter(
            ExtraContextFilter(extra_context={"is_request": True, **context})
        )

    huey_logger = logging.getLogger("huey.consumer")
    if not huey_logger.handlers:
        huey_logger.addHandler(handler)
        huey_logger.addFilter(ExtraContextFilter(extra_context={"is_huey": True}))
    return logger
