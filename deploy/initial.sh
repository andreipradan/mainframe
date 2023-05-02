echo "sudo apt-get update" && sudo apt-get update
echo "Installing postgres deps..." && sudo apt-get -y install libpq-dev && echo "Done."
sudo apt-get install zsh
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
cd "${HOME}/projects/mainframe/deploy" && ./setup.sh requirements restart
