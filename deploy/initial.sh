echo "sudo apt-get update" && sudo apt-get update
echo "Installing postgres deps..." && sudo apt-get -y install libpq-dev && echo "Done."
echo "Installing zsh" && sudo apt-get install zsh
echo "Installing ohmyzsh" && sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
echo "Installing ngrok"
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list && sudo apt update && sudo apt install ngrok
cd "${HOME}/projects/mainframe/deploy" && ./setup.sh requirements restart
