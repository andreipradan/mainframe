#!/bin/bash
set -e -o pipefail

PROJECT_DIR=${HOME}/projects/mainframe
VIRTUALENV_DIR=${HOME}/.virtualenvs/mainframe
LOGS_DIR=/var/log/mainframe/backend

echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - Starting setup"
# Skipped - only needed to run once - echo "Installing postgres deps..." && sudo apt-get -y install libpq-dev && echo "Done."

([[ "$(ls -A "${LOGS_DIR}")" ]] && echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [Logs] Path already exists") || (sudo mkdir -p "${LOGS_DIR}" && sudo touch "${LOGS_DIR}/backend.log" && echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [Logs] Path created")

[[ "$(ls -A "${VIRTUALENV_DIR}")" ]] && echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [Virtualenv] Already exists" || (python -m venv "${VIRTUALENV_DIR}" && echo "[Virtualenv] Created")

if [[ $1 == frontend ]]; then
    echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [Frontend] Setup"
#    cd "${PROJECT_DIR}/frontend"
#    export PATH="$HOME/.nvm/versions/node/v14.16.1/bin:$PATH"
#    npm --max-old-space-size=512 run build
#    DEBUG=True "${VIRTUALENV_DIR}/bin/python" manage.py collectstatic --noinput
    echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [Frontend] Done"
else
    echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [Frontend] No changes"
fi

if [[ $2 == backend ]]; then
  echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - Backend] Installing requirements"
  "${VIRTUALENV_DIR}/bin/python" -m pip install -r "${PROJECT_DIR}/backend/requirements.txt"
  echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [Backend] Done"
fi

"${VIRTUALENV_DIR}/bin/python" "${PROJECT_DIR}/backend/manage.py" set_crons --pre-clear
"${VIRTUALENV_DIR}/bin/python" "${PROJECT_DIR}/backend/manage.py" be_real --post-deploy

if [[ $3 == deploy ]]; then
  echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [Systemd] Restarting all services"
  SERVICES_DIR="${PROJECT_DIR}/deploy/services"
  sudo echo "pi ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart backend" | sudo tee "/etc/sudoers.d/andreierdna"
  echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [Systemd] Copying services to /etc/systemd/system..." && sudo cp -a "${SERVICES_DIR}/." /etc/systemd/system && echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [Systemd] Done."
  echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [Systemd] Reloading systemctl daemon..." && sudo systemctl daemon-reload && echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [Systemd] Done"

  SERVICES=$(ls "${SERVICES_DIR}" | xargs -n 1 basename)
  echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [Systemd] Restarting: ${SERVICES}" && sudo systemctl restart ${SERVICES} && echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [Systemd] Done."
  echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [Systemd] Enabling services..." && sudo systemctl enable ${SERVICES} && echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [Systemd] Done."
else
  echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [Backend] Restarting " && sudo systemctl restart backend && echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [Backend] Done."
fi


"${VIRTUALENV_DIR}/bin/python" "${PROJECT_DIR}/backend/manage.py" send_debug_message "[[Mainframe]] Completed setup"
echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - Setup completed"
