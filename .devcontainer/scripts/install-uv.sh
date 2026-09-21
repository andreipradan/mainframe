#!/bin/sh
set -eu

python3 -m pip install --user --no-cache-dir --disable-pip-version-check "uv==0.8.22"
export PATH="$HOME/.local/bin:$PATH"

uv sync --no-build
