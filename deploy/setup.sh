#!/bin/bash
set -e -o pipefail

PROJECT_DIR=${HOME}/projects/mainframe
VIRTUALENV_DIR=${HOME}/.virtualenvs/mainframe
LOGS_DIR=/var/log/mainframe/backend

echo "Setting crons..." && crontab "${PROJECT_DIR}/deploy/crons" && echo "Done."
# Skipped - only needed to run once - echo "Installing postgres deps..." && sudo apt-get -y install libpq-dev && echo "Done."

([[ "$(ls -A "${LOGS_DIR}")" ]] && echo "Logs dir already exists") || (sudo mkdir -p "${LOGS_DIR}" && sudo touch "${LOGS_DIR}/backend.log" && echo "Created logs dir")

[[ "$(ls -A "${VIRTUALENV_DIR}")" ]] && echo "Virtualenv already exists" || python -m venv "${VIRTUALENV_DIR}"

if [[ $1 == frontend ]]; then
    echo "frontend setup"
#    cd "${PROJECT_DIR}/frontend"
#    export PATH="$HOME/.nvm/versions/node/v14.16.1/bin:$PATH"
#    npm --max-old-space-size=512 run build
#    DEBUG=True "${VIRTUALENV_DIR}/bin/python" manage.py collectstatic --noinput
else
    echo "No frontend changes"
fi

if [[ $2 == backend ]]; then
  echo "Installing backend requirements"
  "${VIRTUALENV_DIR}/bin/python" -m pip install -r "${PROJECT_DIR}/backend/requirements.txt"
fi

# setting initial cron for be_real
"${VIRTUALENV_DIR}/bin/python" "${PROJECT_DIR}/backend/manage.py" be_real --initial

SERVICES_DIR="${PROJECT_DIR}/deploy/services"
sudo echo "pi ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart backend" | sudo tee "/etc/sudoers.d/${USER}"
echo "Copying services to /etc/systemd/system..." && sudo cp -a "${SERVICES_DIR}/." /etc/systemd/system && echo "Done."
echo "Reloading systemctl daemon..." && sudo systemctl daemon-reload && echo "Done."

SERVICES=$(ls "${SERVICES_DIR}" | xargs -n 1 basename)
echo "Restarting: ${SERVICES}" && sudo systemctl restart ${SERVICES} && echo "Done."
echo "Enabling services..." && sudo systemctl enable ${SERVICES} && echo "Done."
/home/andreierdna/.virtualenvs/mainframe/bin/python "${PROJECT_DIR}/backend/manage.py" send_debug_message "[[mainframe]] Completed setup"
echo "Completed setup! >> ./deploy/show-logs.sh"
