#!/bin/bash
set -e -o pipefail
echo "sudo apt-get update" && sudo apt-get update

echo "[zsh] Installing zsh" && sudo apt-get install zsh
echo "[zsh] Installing ohmyzsh" && sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
echo "[zsh] Setting .zshrc aliases" && cat "${HOME}/projects/mainframe/deploy/.zshrc" >> "${HOME}/.zshrc"
echo "[zsh] Setting theme to af-magic" && sed -i -e 's/ZSH_THEME="robbyrussell"/ZSH_THEME="af-magic"/g' "${HOME}/.zshrc"
echi "[zsh] Done."

#echo "Installing drivers for picamera" && sudo apt-get install ffmpeg git python3-picamera python3-ws4py
echo "[env] Setting .env placeholder" && cat "${HOME}/projects/mainframe/deploy/.env" >> "${HOME}/projects/mainframe/backend/.env"
echo "[env] Done."
([[ "$(ls -A "${LOGS_DIR}")" ]] && echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [Logs] Path already exists") || (sudo mkdir -p "${LOGS_DIR}" && sudo touch "${LOGS_DIR}/backend.log" && sudo chown --recursive rpi ${LOGS_DIR} && echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [Logs] Path created")
[[ "$(ls -A "${VIRTUALENV_DIR}")" ]] && echo "$(date -u +"%Y-%m-%d %H:%M:%SZ") - [Virtualenv] Already exists" || (python -m venv "${VIRTUALENV_DIR}" && echo "[Virtualenv] Created")

echo "[postgres] Installing postgres deps..." && sudo apt-get -y install libpq-dev && echo "[postgres] Done."

echo "[nginx] Installing nginx" && sudo apt-get -y install nginx
echo "[nginx] Adding configuration" && cat "${HOME}/projects/mainframe/deploy/nginx.conf" >> /etc/nginx/sites-available/mainframe
sudo ln -s /etc/nginx/sites-available/mainframe /etc/nginx/sites-enabled
echo "[nginx] Done."

echo "[ngrok] Installing ngrok"
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list && sudo apt update && sudo apt install ngrok
echo "[ngrok] Setting ngrok tunnels" && cat "${HOME}/projects/mainframe/deploy/ngrok.yml" >> "${HOME}/.config/ngrok/ngrok.yml"
echi "[ngrok] Done."

echo "[redis] Installing redis server" && sudo apt install redis-server && echo "[redis] Done."

echo "[homebridge] Installing homebridge"
curl -sSfL https://repo.homebridge.io/KEY.gpg | sudo gpg --dearmor | sudo tee /usr/share/keyrings/homebridge.gpg  > /dev/null
echo "deb [signed-by=/usr/share/keyrings/homebridge.gpg] https://repo.homebridge.io stable main" | sudo tee /etc/apt/sources.list.d/homebridge.list > /dev/null
sudo apt-get install homebridge
echo "[homebridge] Done."

echo "=== Initial setup Done! ==="
echo "Please fill out the env vars inside mainframe/backend/.env"
echo "then do '~/projects/mainframe/deploy/setup.sh requirements restart'"
