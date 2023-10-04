import subprocess
from operator import itemgetter
from pathlib import Path

from clients.logs import get_default_logger


def get_folder_contents(folder):
    return sorted(
        [
            {
                "name": item.name,
                "is_file": item.is_file(),
            }
            for item in Path(folder).iterdir()
        ],
        key=itemgetter("is_file", "name"),
    )


def run_cmd(cmd, prefix=None, logger=None, **kwargs):
    prefix = prefix.upper() if prefix else cmd
    logger = logger or get_default_logger(__name__)
    logger.info("[%s] Starting", prefix)
    try:
        output = subprocess.check_output(cmd.split(" "), **kwargs).decode("utf-8")
    except subprocess.CalledProcessError as e:
        raise RuntimeError(
            "command '{}' return with error (code {}): {}".format(
                e.cmd, e.returncode, e.output
            )
        )
    if output:
        logger.info("[%s] Output: %s", prefix, output)
    logger.info("[%s] Done.", prefix)
    return output
