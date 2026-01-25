#!/bin/sh
set -e

sudo apt-get update
sudo apt-get install -y locales
sudo sed -i 's/^# *\(en_US.UTF-8 UTF-8\)/\1/' /etc/locale.gen
locale-gen en_US.UTF-8
sudo update-locale LANG=en_US.UTF-8 LC_TIME=en_US.UTF-8
