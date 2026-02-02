#!/bin/bash
set -e

sudo service postgresql start
sudo redis-server --daemonize yes
echo "PostgreSQL and Redis services started."
