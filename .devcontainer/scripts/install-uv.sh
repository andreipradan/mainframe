#!/bin/sh
set -e

curl --proto-redir '=https' -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"

uv sync --locked
