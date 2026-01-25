#!/bin/sh
set -e

REDIS_VERSION=7.0.11
# Install Redis server
sudo apt-get install -y build-essential tcl wget curl

cd /tmp
wget http://download.redis.io/releases/redis-${REDIS_VERSION}.tar.gz
tar xzf redis-${REDIS_VERSION}.tar.gz
cd redis-${REDIS_VERSION}
make
sudo make install
# Start Redis server
sudo redis-server --daemonize yes
# Verify Redis server is running
redis-cli ping
echo "Redis installation and startup complete."
