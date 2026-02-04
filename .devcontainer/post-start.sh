#!/bin/bash
set -e

./.devcontainer/scripts/set-local-env-vars.sh

sudo service postgresql start
sudo redis-server --daemonize yes
echo "PostgreSQL and Redis services started."
