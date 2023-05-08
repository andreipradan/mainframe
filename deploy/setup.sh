#!/bin/bash
set -e -o pipefail

PROJECT_DIR=${HOME}/projects/mainframe
VIRTUALENV_DIR=${HOME}/projects/.virtualenvs/mainframe

echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [setup] Started"

if [[ $1 == requirements ]]; then
  echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [setup][requirements] Installing" && "${VIRTUALENV_DIR}/bin/python" -m pip install -r "${PROJECT_DIR}/backend/requirements.txt" --no-cache-dir
  echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [setup][requirements] Done"
fi

if [[ $2 == restart ]]; then
  echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [setup][services] Restarting all" && sudo echo "pi ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart backend" | sudo tee "/etc/sudoers.d/rpi"
  echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [setup][services] Copying to /etc/systemd/system" && sudo cp -a "${PROJECT_DIR}/deploy/services/." /etc/systemd/system
  echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [setup][services] Reloading daemon" && sudo systemctl daemon-reload

  SERVICES=$(ls "${PROJECT_DIR}/deploy/services" | xargs -n 1 basename)
  echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [setup][services] Restarting: ${SERVICES}" && sudo systemctl restart ${SERVICES}
  echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [setup][services] Enabling" && sudo systemctl enable ${SERVICES}
  echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [setup][services] Done."
else
  echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [setup] Restarting backend" && sudo systemctl restart backend
fi

"${VIRTUALENV_DIR}/bin/python" "${PROJECT_DIR}/backend/manage.py" send_debug_message "[[deploy]] Done."
echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [setup] Done."
