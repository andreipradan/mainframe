#!/bin/bash
set -e -o pipefail

NGINX_DIR=/etc/nginx
NGINX_AVAILABLE="${NGINX_DIR}/sites-available/mainframe"
NGINX_ENABLED="${NGINX_DIR}/sites-enabled/mainframe"
NGINX_ENABLED_DEFAULT="${NGINX_DIR}/sites-enabled/default"
PROJECT_DIR=${HOME}/projects/mainframe

if [[ $1 == "skip-install" ]]; then
  echo "Skipping install"
else
  echo "[nginx] Installing nginx" && sudo apt-get -y install nginx
fi

echo "[nginx] Adding configuration"
if [ -f "$NGINX_AVAILABLE" ]; then sudo rm $NGINX_AVAILABLE && echo "Deleted ${NGINX_AVAILABLE}"; else echo "File not found: ${NGINX_AVAILABLE}"; fi
if [ -f "$NGINX_ENABLED" ]; then sudo rm $NGINX_ENABLED && echo "Deleted ${NGINX_ENABLED}"; else echo "File not found: ${NGINX_ENABLED}"; fi
if [ -f "$NGINX_ENABLED_DEFAULT" ]; then sudo rm $NGINX_ENABLED_DEFAULT && echo "Deleted ${NGINX_ENABLED_DEFAULT}"; else echo "File not found: ${NGINX_ENABLED_DEFAULT}"; fi
sudo touch ${NGINX_AVAILABLE}
sudo chown rpi $NGINX_AVAILABLE
cat "${PROJECT_DIR}/deploy/nginx.conf" >> $NGINX_AVAILABLE
sudo ln -s ${NGINX_AVAILABLE} $NGINX_DIR/sites-enabled
sudo nginx -t
sudo systemctl restart nginx
echo "[nginx] Done."
