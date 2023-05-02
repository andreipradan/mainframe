sudo apt-get update
echo "Installing postgres deps..." && sudo apt-get -y install libpq-dev && echo "Done."
sudo apt-get install zsh
cd "${HOME}/mainframe/deploy" && ./setup.sh requirements restart
