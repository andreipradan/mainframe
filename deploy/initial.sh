echo "sudo apt-get update" && sudo apt-get update
echo "Installing postgres deps..." && sudo apt-get -y install libpq-dev && echo "Done."
echo "Installing zsh" && sudo apt-get install zsh
echo "Installing ohmyzsh" && sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
echo "Setting .zshrc aliases" && cat "${HOME}/projects/mainframe/deploy/.zshrc" >> "${HOME}/.zshrc"
echo "Setting theme to af-magic" && sed -i -e 's/ZSH_THEME="robbyrussell"/ZSH_THEME="af-magic"/g' "${HOME}/.zshrc"
echo "Installing ngrok"
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list && sudo apt update && sudo apt install ngrok
echo "Setting ngrok tunnels" && cat "${HOME}/projects/mainframe/deploy/ngrok.yml" >> "${HOME}/.config/ngrok/ngrok.yml"
echo "Installing redis server" && sudo apt install redis-server
echo "Installing homebridge"
curl -sSfL https://repo.homebridge.io/KEY.gpg | sudo gpg --dearmor | sudo tee /usr/share/keyrings/homebridge.gpg  > /dev/null
echo "deb [signed-by=/usr/share/keyrings/homebridge.gpg] https://repo.homebridge.io stable main" | sudo tee /etc/apt/sources.list.d/homebridge.list > /dev/null
sudo apt-get install homebridge
#echo "Installing drivers for picamera" && sudo apt-get install ffmpeg git python3-picamera python3-ws4py
echo "Setting .env placeholder" && cat "${HOME}/projects/mainframe/deploy/.env" >> "${HOME}/projects/mainframe/backend/.env"
echo "=== Initial setup Done! ==="
echo "Please fill out the env vars inside mainframe/backend/.env"
echo "then do '~/projects/mainframe/deploy/setup.sh requirements restart'"
