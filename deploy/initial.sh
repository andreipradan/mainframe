#!/bin/bash
set -e -o pipefail
echo "sudo apt-get update" && sudo apt-get update

LOGS_DIR=/var/log/mainframe/backend
REDIS_DIR=/etc/redis
PROJECT_DIR=${HOME}/projects/mainframe
VIRTUALENV_DIR=${HOME}/projects/.virtualenvs/mainframe

/bin/bash "${PROJECT_DIR}/deploy/setup/zsh.sh"

#echo "Installing drivers for picamera" && sudo apt-get install ffmpeg git python3-picamera python3-ws4py
echo "[env] Setting .env placeholder" && cat "${PROJECT_DIR}/deploy/.env" >> "${PROJECT_DIR}/backend/.env"
([[ "$(ls -A "${LOGS_DIR}")" ]] && echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [Logs] Path already exists") || (sudo mkdir -p "${LOGS_DIR}" && sudo touch "${LOGS_DIR}/backend.log" && sudo chown --recursive rpi ${LOGS_DIR} && echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [Logs] Path created")
[[ "$(ls -A "${VIRTUALENV_DIR}")" ]] && echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [Virtualenv] Already exists" || (python -m venv "${VIRTUALENV_DIR}" && echo "[Virtualenv] Created")
echo "[env] Done."

echo "[postgres] Installing postgres deps..." && sudo apt-get -y install libpq-dev && echo "[postgres] Done."

/bin/bash "${PROJECT_DIR}/deploy/setup/nginx.sh"

echo "[ngrok] Installing ngrok"
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list && sudo apt update && sudo apt install ngrok
echi "[ngrok] Done."

echo "[redis] Installing redis server"
sudo apt install redis-server
echo "[redis] Setting supervised from no to systemd"
sed -i -e 's/supervised no/supervised systemd/g' "${REDIS_DIR}/redis.conf"
sudo systemctl restart redis.service
echo "[redis] Done."

echo "[homebridge] Installing homebridge"
curl -sSfL https://repo.homebridge.io/KEY.gpg | sudo gpg --dearmor | sudo tee /usr/share/keyrings/homebridge.gpg  > /dev/null
echo "deb [signed-by=/usr/share/keyrings/homebridge.gpg] https://repo.homebridge.io stable main" | sudo tee /etc/apt/sources.list.d/homebridge.list > /dev/null
sudo apt-get install homebridge
echo "[homebridge] Done."

echo "=== Initial setup Done! ==="
echo "Please fill out the env vars inside mainframe/backend/.env"
echo "then do '~/projects/mainframe/deploy/setup.sh requirements restart'"
