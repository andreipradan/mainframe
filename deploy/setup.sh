#!/bin/bash
set -e -o pipefail

PROJECT_DIR=${HOME}/projects/mainframe
VIRTUALENV_DIR=${HOME}/.virtualenvs/mainframe

echo "Setting crons..." && crontab "${PROJECT_DIR}/deploy/crons" && echo "Done."
# Skipped - only needed to run once - echo "Installing postgres deps..." && sudo apt-get -y install libpq-dev && echo "Done."

[[ "$(ls -A "${VIRTUALENV_DIR}")" ]] && echo "Virtualenv already exists" || python -m venv "${VIRTUALENV_DIR}"

if [[ $1 == frontend ]]; then
    echo "Frontend setup"
    cd "${PROJECT_DIR}/frontend"
    npm run build
    npm install --global serve
else
    echo "No frontend changes"
fi

if [[ $2 == backend ]]; then
  echo "Installing backend requirements"
  "${VIRTUALENV_DIR}/bin/python" -m pip install -r "${PROJECT_DIR}/backend/requirements.txt"
fi

SERVICES_DIR="${PROJECT_DIR}/deploy/services"
sudo echo "pi ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart backend" | sudo tee "/etc/sudoers.d/${USER}"
echo "Copying services to /etc/systemd/system..." && sudo cp -a "${SERVICES_DIR}/." /etc/systemd/system && echo "Done."
echo "Reloading systemctl daemon..." && sudo systemctl daemon-reload && echo "Done."

SERVICES=$(ls "${SERVICES_DIR}" | xargs -n 1 basename)
echo "Restarting: ${SERVICES}" && sudo systemctl restart ${SERVICES} && echo "Done."
echo "Enabling services..." && sudo systemctl enable ${SERVICES} && echo "Done."
/home/andreierdna/.virtualenvs/mainframe/bin/python "${PROJECT_DIR}/backend/manage.py" send_debug_message "[[mainframe]] Completed setup"
echo "Completed setup! >> ./deploy/show-logs.sh"