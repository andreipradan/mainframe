#!/bin/sh
set -e

# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"

# Sync Python dependencies
uv sync

# Install PostgreSQL server and client tools
sudo apt-get update
sudo apt-get install -y locales
sudo locale-gen en_GB.UTF-8
sudo update-locale LANG=en_GB.UTF-8 LC_TIME=en_GB.UTF-8

sudo apt-get install -y postgresql postgresql-contrib postgresql-client

# Start PostgreSQL (may fail in container but that's okay)
sudo service postgresql start 2>&1 || true

# Fix PostgreSQL authentication for dev container
# Change local socket authentication from 'peer' to 'trust' to allow password auth
if [ -f /etc/postgresql/17/main/pg_hba.conf ]; then
    sudo sed -i "s/^local   all             postgres                                peer$/local   all             postgres                                trust/" /etc/postgresql/17/main/pg_hba.conf
    sudo sed -i "s/^local   all             all                                     peer$/local   all             all                                     trust/" /etc/postgresql/17/main/pg_hba.conf
    sudo service postgresql reload 2>&1 || true
fi

# Create test database and user
if id "postgres" &>/dev/null; then
    psql -U postgres << EOSQL
CREATE USER test_user WITH PASSWORD 'test_pass' CREATEDB;
CREATE DATABASE test_db WITH OWNER test_user;
EOSQL
fi
