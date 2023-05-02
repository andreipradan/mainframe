sudo apt-get update
echo "Installing postgres deps..." && sudo apt-get -y install libpq-dev && echo "Done."
sudo apt-get install zsh

goto && git clone https://github.com/andreipradan/mainframe.git
cd mainframe && ./deploy/setup.sh requirements restart
