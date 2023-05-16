#!/bin/bash
set -e -o pipefail

PROJECT_DIR=${HOME}/projects/mainframe

if [ "$1" == "--continue" ]; then

  cat "${PROJECT_DIR}/deploy/ngrok.yml" >> "$HOME/.config/ngrok/ngrok.yml"

  REDIS_DIR=/etc/redis
  echo "[redis] Installing redis server"
  sudo apt install -y redis-server
  echo "[redis] Setting supervised from no to systemd"
  sudo sed -i -e 's/supervised no/supervised systemd/g' "${REDIS_DIR}/redis.conf"
  sudo systemctl restart redis.service
  echo "[redis] Done."

  echo "=== Initial setup Done! ==="
  echo "Please fill out the env vars inside mainframe/backend/.env"
  echo "then do '~/projects/mainframe/deploy/setup.sh requirements restart'"
  exit 0
fi

echo "[homebridge] Installing homebridge"
curl -sSfL https://repo.homebridge.io/KEY.gpg | sudo gpg --dearmor | sudo tee /usr/share/keyrings/homebridge.gpg  > /dev/null
echo "deb [signed-by=/usr/share/keyrings/homebridge.gpg] https://repo.homebridge.io stable main" | sudo tee /etc/apt/sources.list.d/homebridge.list > /dev/null
echo "sudo apt-get update" && sudo apt-get update
sudo apt-get install -y homebridge
echo "[homebridge] Done."

echo "[zsh] Installing zsh" && sudo apt-get install -y zsh
echo "[zsh] Installing ohmyzsh" && sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
echo "[zsh] Setting .zshrc aliases" && cat "${PROJECT_DIR}/deploy/.zshrc" >> "${HOME}/.zshrc"
echo "[zsh] Setting theme to af-magic" && sed -i -e 's/ZSH_THEME="robbyrussell"/ZSH_THEME="af-magic"/g' "${HOME}/.zshrc"
echo "[zsh] Done."

#echo "Installing drivers for picamera" && sudo apt-get install ffmpeg git python3-picamera python3-ws4py

echo "[env] Setting .env placeholder" &&
ENV_FILE="${PROJECT_DIR}/backend/.env"
if [ -f "$ENV_FILE" ]; then
  echo "env file already exists";
else
  cat "${PROJECT_DIR}/deploy/.env" >> "$ENV_FILE";
fi

LOGS_DIR=/var/log/mainframe
echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [logs] Creating logs path"
if [ -d "${LOGS_DIR}" ]; then
  echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [logs] Path already exists";
else
  sudo mkdir -p "${LOGS_DIR}";
  sudo touch "${LOGS_DIR}/server.log";
  sudo chown -R rpi.rpi ${LOGS_DIR}
  echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [logs] Path created"
fi

VIRTUALENV_DIR=${HOME}/projects/.virtualenvs/mainframe
echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [venv] Creating venv"
if [ -d "${VIRTUALENV_DIR}" ]; then
  echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [venv] Already exists"
else
  python -m venv "${VIRTUALENV_DIR}";
  echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [venv] Created"
fi
echo "[env] Done."

echo "[postgres] Installing postgres deps..." && sudo apt-get -y install libpq-dev && echo "[postgres] Done."

#NGINX_DIR=/etc/nginx
#NGINX_AVAILABLE="${NGINX_DIR}/sites-available/mainframe"
#NGINX_ENABLED="${NGINX_DIR}/sites-enabled/mainframe"
#NGINX_ENABLED_DEFAULT="${NGINX_DIR}/sites-enabled/default"
#PROJECT_DIR=${HOME}/projects/mainframe
#echo "[nginx] Installing nginx" && sudo apt-get -y install nginx
#echo "[nginx] Adding configuration"
#if [ -f "$NGINX_AVAILABLE" ]; then sudo rm $NGINX_AVAILABLE && echo "Deleted ${NGINX_AVAILABLE}"; else echo "File not found: ${NGINX_AVAILABLE}"; fi
#if [ -f "$NGINX_ENABLED" ]; then sudo rm $NGINX_ENABLED && echo "Deleted ${NGINX_ENABLED}"; else echo "File not found: ${NGINX_ENABLED}"; fi
#if [ -f "$NGINX_ENABLED_DEFAULT" ]; then sudo rm $NGINX_ENABLED_DEFAULT && echo "Deleted ${NGINX_ENABLED_DEFAULT}"; else echo "File not found: ${NGINX_ENABLED_DEFAULT}"; fi
#sudo touch ${NGINX_AVAILABLE}
#sudo chown rpi $NGINX_AVAILABLE
#cat "${PROJECT_DIR}/deploy/nginx.conf" >> $NGINX_AVAILABLE
#sudo ln -s ${NGINX_AVAILABLE} $NGINX_DIR/sites-enabled
#sudo nginx -t
#sudo systemctl restart nginx
#echo "[nginx] Done."

echo "[ngrok] Installing ngrok"
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list && sudo apt update && sudo apt install ngrok

echo "[ngrok] Done."
echo "[ngrok] Log into your ngrok account https://dashboard.ngrok.com/get-started/your-authtoken"
echo "and copy add your auth token here by doing:"
echo "ngrok config add-authtoken <your auth token here>"
echo "then continue with ./deploy/initial.sh --continue"
exit 0
