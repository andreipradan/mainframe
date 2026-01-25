#!/bin/sh
set -e

# Install PostgreSQL server and client tools
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
CREATE USER local_user WITH PASSWORD 'local_pass' CREATEDB;
CREATE DATABASE test_db WITH OWNER test_user;
CREATE DATABASE local_db WITH OWNER local_user;
EOSQL
fi

uv run poe migrate
