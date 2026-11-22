#!/bin/sh
set -e

ENV_FILE=${ENV_FILE:-/workspaces/mainframe/src/mainframe/.env}
ALLOWED_HOSTS="localhost,127.0.0.1"
DEV_SUPERUSER_PASSWORD=""

if [ -f "$ENV_FILE" ]; then
  DEV_SUPERUSER_PASSWORD=$(sed -n 's/^DEV_SUPERUSER_PASSWORD=//p' "$ENV_FILE" | tail -n 1)
fi

if [ -z "$DEV_SUPERUSER_PASSWORD" ]; then
  DEV_SUPERUSER_PASSWORD=$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')
fi

if [ -n "${CODESPACE_NAME:-}" ]; then
  ALLOWED_HOSTS="${ALLOWED_HOSTS},${CODESPACE_NAME}-8000.app.github.dev"
fi

umask 077
: > "$ENV_FILE"
chmod 600 "$ENV_FILE"

{
  echo "ALLOWED_HOSTS=${ALLOWED_HOSTS}"
  echo "CORS_ALLOW_ALL_ORIGINS=True"
  echo "DB_DATABASE=local_db"
  echo "DB_HOST=localhost"
  echo "DB_PASSWORD=local_pass"
  echo "DB_PORT=5432"
  echo "DB_USER=local_user"
  echo "DEBUG=True"
  echo "DEV_SUPERUSER_PASSWORD=${DEV_SUPERUSER_PASSWORD}"
  echo "EARTHQUAKE_DEFAULT_COORDINATES=0,0"
  echo "ENV=local"
} >> "$ENV_FILE"
