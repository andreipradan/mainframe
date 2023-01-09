import logging
import subprocess
from pathlib import Path


logging.basicConfig(format="%(asctime)s - %(levelname)s:%(name)s - %(message)s")
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


def full_setup():
    run_cmd("poetry export -f requirements.txt --output requirements.txt --without-hashes")
    run_cmd("poetry run pip install -r requirements.txt")

    permissions = "pi ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart reddit"
    run_cmd(f'echo "{permissions}" > /etc/sudoers.d/pi', silent=False)

    services_dir = Path(__file__).resolve().parent / "services"
    service_files = list(filter(Path.is_file, Path(services_dir).iterdir()))
    run_cmd(f"sudo cp {' '.join(map(str, service_files))} /etc/systemd/system")

    services = [s.name for s in service_files]
    run_cmd("sudo systemctl daemon-reload")
    run_cmd(f"sudo systemctl restart {' '.join(services)}")
    run_cmd(f"sudo systemctl enable {' '.join(services)}")
    logger.info("Completed setup! >> ./deploy/show-logs.sh")


def run_cmd(cmd, silent=True):
    logger.debug(f"Running '{cmd}'")
    process = subprocess.Popen(cmd.split(" "), stdout=subprocess.PIPE)
    output, error = process.communicate()
    if error:
        if not silent:
            raise ValueError(error)
        return logger.warning(f"Error: {error}")

    logger.debug(f"Output: {output}")
    if not (silent or output):
        raise ValueError(f"No output from running: '{cmd}'")
    logger.info("Done.")
    return output
