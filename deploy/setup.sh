#!/bin/bash
set -e -o pipefail

PROJECT_DIR=${HOME}/projects/mainframe
VIRTUALENV_DIR=${HOME}/projects/.virtualenvs/mainframe

echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - Starting setup"

if [[ $1 == requirements ]]; then
  echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - Backend] Installing requirements"
  "${VIRTUALENV_DIR}/bin/python" -m pip install -r "${PROJECT_DIR}/backend/requirements.txt" --no-cache-dir
  echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [Backend] Done"
fi

if [[ $2 == restart ]]; then
  echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [Systemd] Restarting all services"
  SERVICES_DIR="${PROJECT_DIR}/deploy/services"
  sudo echo "pi ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart backend" | sudo tee "/etc/sudoers.d/rpi"
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
