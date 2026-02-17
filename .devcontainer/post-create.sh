#!/bin/bash
set -e

./.devcontainer/scripts/install-uv.sh
./.devcontainer/scripts/install-postgres.sh
./.devcontainer/scripts/install-redis.sh
./.devcontainer/scripts/set-local-env-vars.sh

uv run poe migrate
uv run pre-commit install

npm install --prefix /workspaces/mainframe/frontend
