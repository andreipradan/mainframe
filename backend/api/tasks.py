import logging

from huey.contrib.djhuey import task
from clients.chat import send_telegram_message
from clients.system import run_cmd

from clients.logs import MainframeHandler


@task(expires=10)
def deploy():
    logger = logging.getLogger(__name__)
    logger.addHandler(MainframeHandler())

    prefix = "[Deploy]"
    logger.info(f"Starting deployment...")

    if not (output := run_cmd("git pull origin main")):
        return send_telegram_message(text=f"{prefix} Could not git pull")
    if output.strip() == b"Already up to date.":
        return send_telegram_message(text=f"[{prefix}] {output.strip()}")

    if output.strip().startswith("CONFLICT"):
        return send_telegram_message(text=f"[{prefix}] Could not git pull - conflict")

    cmd_params = []
    msg_extra = []
    if "requirements.txt" in output.strip():
        cmd_params.append("requirements")
        msg_extra.append("requirements")
    else:
        cmd_params.append("no-requirements")

    if "deploy/" in output.strip():
        cmd_params.append("restart")
        msg_extra.append("Restart all services")
    else:
        msg_extra.append("Restart backend")

    msg = f"{prefix} Starting local setup"
    if msg_extra:
        msg += f" (+ {' & '.join(msg_extra)})"

    send_telegram_message(text=msg)

    logs_path = f"/var/log/mainframe/deploy/"
    mkdir = f"mkdir -p {logs_path}`date +%Y`"
    output = f"{logs_path}`date +%Y`/`date +%Y-%m`.log 2>&1"

    deploy_cmd = f"$HOME/projects/mainframe/deploy/setup.sh {' '.join(cmd_params)}"
    command = f"{mkdir} && {deploy_cmd} >> {output}"
    run_cmd(command, prefix=prefix, logger=logger)
