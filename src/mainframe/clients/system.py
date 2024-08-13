import subprocess
from operator import itemgetter
from pathlib import Path

from mainframe.clients.logs import get_default_logger


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


def run_cmd(cmd, prefix=None, logger=None, **kwargs) -> str:
    prefix = prefix.upper() if prefix else cmd
    logger = logger or get_default_logger(__name__)
    logger.info("[%s] Starting", prefix)
    p = subprocess.Popen(  # noqa: S603
        cmd.split(),  # noqa: S603
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        **kwargs,
    )
    output, error = p.communicate()
    if p.returncode != 0:
        raise RuntimeError(
            f"Command '{cmd}' failed, "
            f"return code: {p.returncode}, "
            f"error: '{error}', "
            f"output: '{output}'"
        )
    if output:
        logger.info("[%s] Output: %s", prefix, output)

    logger.info("[%s] Done.", prefix)
    return output.decode() if isinstance(output, bytes) else output
