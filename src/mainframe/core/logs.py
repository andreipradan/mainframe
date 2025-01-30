import logging
from contextlib import contextmanager

import logfire


class LogCaptureHandler(logging.Handler):
    def __init__(self, log_level):
        super().__init__()
        self.captured_logs = []
        self.log_level = log_level

    def emit(self, record):
        if record.levelno >= self.log_level:
            self.captured_logs.append(record)


@contextmanager
def capture_command_logs(logger, log_level, span_name):
    capture_handler = LogCaptureHandler(log_level)
    logger.addHandler(capture_handler)
    yield
    logger.removeHandler(capture_handler)
    if capture_handler.captured_logs:
        with logfire.span(span_name):
            for log in capture_handler.captured_logs:
                logging.getLogger("logfire").handle(log)
