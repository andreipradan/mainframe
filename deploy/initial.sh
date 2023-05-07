#!/bin/bash
set -e -o pipefail
echo "sudo apt-get update" && sudo apt-get update

LOGS_DIR=/var/log/mainframe/backend
NGINX_DIR=/etc/nginx/sites-available
REDIS_DIR=/etc/redis
PROJECT_DIR=${HOME}/projects/mainframe
VIRTUALENV_DIR=${HOME}/projects/.virtualenvs/mainframe

echo "[zsh] Installing zsh" && sudo apt-get install zsh
echo "[zsh] Installing ohmyzsh" && sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
echo "[zsh] Setting .zshrc aliases" && cat "${PROJECT_DIR}/deploy/.zshrc" >> "${HOME}/.zshrc"
echo "[zsh] Setting theme to af-magic" && sed -i -e 's/ZSH_THEME="robbyrussell"/ZSH_THEME="af-magic"/g' "${HOME}/.zshrc"
echi "[zsh] Done."

#echo "Installing drivers for picamera" && sudo apt-get install ffmpeg git python3-picamera python3-ws4py
echo "[env] Setting .env placeholder" && cat "${PROJECT_DIR}/deploy/.env" >> "${PROJECT_DIR}/backend/.env"
([[ "$(ls -A "${LOGS_DIR}")" ]] && echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [Logs] Path already exists") || (sudo mkdir -p "${LOGS_DIR}" && sudo touch "${LOGS_DIR}/backend.log" && sudo chown --recursive rpi ${LOGS_DIR} && echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [Logs] Path created")
[[ "$(ls -A "${VIRTUALENV_DIR}")" ]] && echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [Virtualenv] Already exists" || (python -m venv "${VIRTUALENV_DIR}" && echo "[Virtualenv] Created")
echo "[env] Done."

echo "[postgres] Installing postgres deps..." && sudo apt-get -y install libpq-dev && echo "[postgres] Done."

echo "[nginx] Installing nginx" && sudo apt-get -y install nginx
echo "[nginx] Adding configuration"
sudo touch ${NGINX_DIR}/mainframe
sudo chown rpi $NGINX_DIR/mainframe
cat "${PROJECT_DIR}/deploy/nginx.conf" >> "${NGINX_DIR}/mainframe"
sudo ln -s "${NGINX_DIR}/mainframe" $NGINX_DIR
sudo nginx -t
sudo systemctl restart nginx
echo "[nginx] Done."

echo "[ngrok] Installing ngrok"
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list && sudo apt update && sudo apt install ngrok
echo "[ngrok] Setting ngrok tunnels" && cat "${PROJECT_DIR}/deploy/ngrok.yml" >> "${HOME}/.config/ngrok/ngrok.yml"
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
