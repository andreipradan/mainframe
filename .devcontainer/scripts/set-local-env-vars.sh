#!/bin/sh
set -e

ENV_FILE=/workspaces/mainframe/src/mainframe/.env
ALLOWED_HOSTS="localhost,127.0.0.1"

if [ -n "${CODESPACE_NAME:-}" ]; then
  ALLOWED_HOSTS="${ALLOWED_HOSTS},${CODESPACE_NAME}-8000.app.github.dev"
fi

# Clear existing environment variables in the file
> $ENV_FILE

{
  echo "ALLOWED_HOSTS=${ALLOWED_HOSTS}"
  echo "CORS_ALLOW_ALL_ORIGINS=True"
  echo "DB_DATABASE=local_db"
  echo "DB_HOST=localhost"
  echo "DB_PASSWORD=local_pass"
  echo "DB_PORT=5432"
  echo "DB_USER=local_user"
  echo "DEBUG=True"
  echo "EARTHQUAKE_DEFAULT_COORDINATES=0,0"
  echo "ENV=local"
} >> $ENV_FILE
