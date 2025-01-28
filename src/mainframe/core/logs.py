import logging

import logfire


def get_default_logger(name):
    logging.basicConfig(handlers=[logfire.LogfireLoggingHandler()])
    return logging.getLogger(name)
