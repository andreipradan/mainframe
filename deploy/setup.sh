#!/bin/bash
set -e -o pipefail

PROJECT_DIR=${HOME}/projects/mainframe
VIRTUALENV_DIR=${HOME}/projects/.virtualenvs/mainframe

echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [setup] Started"

# Determine which actions to perform based on any of the provided args
HAS_REQUIREMENTS=false
HAS_MIGRATE=false
HAS_RESTART=false
for arg in "$@"; do
  case "${arg}" in
    requirements)
      HAS_REQUIREMENTS=true
      ;;
    migrate)
      HAS_MIGRATE=true
      ;;
    restart)
      HAS_RESTART=true
      ;;
  esac
done

if [[ "${HAS_REQUIREMENTS}" == true ]]; then
  echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [setup][requirements] Installing"
  "${VIRTUALENV_DIR}/bin/python" -m pip install "${PROJECT_DIR}" --no-cache-dir
  echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [setup][requirements] Done"
fi

if [[ "${HAS_MIGRATE}" == true ]]; then
  echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [setup][migrate] Running Django migrations"
  "${VIRTUALENV_DIR}/bin/python" "${PROJECT_DIR}/src/manage.py" migrate --noinput
  echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [setup][migrate] Done"
fi

if [[ "${HAS_RESTART}" == true ]]; then
  echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [setup][services] Restarting all"
#  sudo echo "rpi ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart backend" | sudo tee "/etc/sudoers.d/rpi"
  echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [setup][services] Copying to /etc/systemd/system"
  sudo cp -a "${PROJECT_DIR}/deploy/services/." /etc/systemd/system
  echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [setup][services] Reloading daemon"
  sudo systemctl daemon-reload

  # Build a safe list of service unit names (handle spaces/special chars)
  SERVICES=()
  while IFS= read -r -d '' f; do
    SERVICES+=("$(basename "$f")")
  done < <(find "${PROJECT_DIR}/deploy/services" -maxdepth 1 -mindepth 1 -print0)

  echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [setup][services] Restarting: ${SERVICES[*]}"
  sudo systemctl restart "${SERVICES[@]}"
  echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [setup][services] Enabling"
  sudo systemctl enable "${SERVICES[@]}"
  echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [setup][services] Done."
else
  echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [setup] Restarting backend"
  sudo systemctl restart backend huey
fi

echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [setup] done."
