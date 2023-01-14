#!/bin/bash
set -e -o pipefail

PROJECT_DIR=${HOME}/projects/mainframe/backend
VIRTUALENV_DIR=${HOME}/.virtualenvs/mainframe

#echo "Setting crons..." && crontab "${PROJECT_DIR}/deploy/crons" && echo "Done."
echo "Installing postgres deps..." && sudo apt-get -y install libpq-dev && echo "Done."

[[ "$(ls -A "${VIRTUALENV_DIR}")" ]] && echo "Virtualenv already exists" || python -m venv "${VIRTUALENV_DIR}"
"${VIRTUALENV_DIR}/bin/python" -m pip install -r "${PROJECT_DIR}/requirements.txt"

SERVICES_DIR="${PROJECT_DIR}/deploy/services"
sudo echo "pi ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart backend" | sudo tee "/etc/sudoers.d/${USER}"
echo "Copying services to /etc/systemd/system..." && sudo cp -a "${SERVICES_DIR}/." /etc/systemd/system && echo "Done."
echo "Reloading systemctl daemon..." && sudo systemctl daemon-reload && echo "Done."

SERVICES=$(ls "${SERVICES_DIR}" | xargs -n 1 basename)
echo "Restarting: ${SERVICES}" && sudo systemctl restart ${SERVICES} && echo "Done."
echo "Enabling services..." && sudo systemctl enable ${SERVICES} && echo "Done."
echo "Completed setup! >> ./deploy/show-logs.sh"
