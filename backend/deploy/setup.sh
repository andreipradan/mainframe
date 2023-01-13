#!/bin/bash
set -e -o pipefail

virtualenv_dir=${HOME}/.virtualenvs/mainframe
[[ "$(ls -A "${virtualenv_dir}")" ]] && echo "Virtualenv already exists" || python -m venv "${virtualenv_dir}"
sudo apt-get -y install libpq-dev
"${virtualenv_dir}/bin/python" -m pip install -r "${HOME}/projects/mainframe/backend/requirements.txt"

SERVICES_DIR="${HOME}/projects/mainframe/backend/deploy/services"
sudo echo "pi ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart backend" | sudo tee "/etc/sudoers.d/${USER}"
sudo cp -a "${SERVICES_DIR}/." /etc/systemd/system
sudo systemctl daemon-reload
SERVICES=$(ls "${SERVICES_DIR}" | xargs -n 1 basename)
sudo systemctl restart ${SERVICES}
sudo systemctl enable ${SERVICES}

echo "Completed setup! >> ./deploy/show-logs.sh"
