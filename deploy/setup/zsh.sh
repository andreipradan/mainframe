#!/bin/bash
set -e -o pipefail

echo "[zsh] Installing zsh" && sudo apt-get install zsh
echo "[zsh] Installing ohmyzsh" && sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
echo "[zsh] Setting .zshrc aliases" && cat "${PROJECT_DIR}/deploy/.zshrc" >> "${HOME}/.zshrc"
echo "[zsh] Setting theme to af-magic" && sed -i -e 's/ZSH_THEME="robbyrussell"/ZSH_THEME="af-magic"/g' "${HOME}/.zshrc"
echi "[zsh] Done."
