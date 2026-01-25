#!/bin/bash
set -e

./.devcontainer/scripts/install-uv.sh
./.devcontainer/scripts/set-local-env-vars.sh
./.devcontainer/scripts/install-locale.sh
./.devcontainer/scripts/install-postgres.sh
./.devcontainer/scripts/install-redis.sh

npm install --prefix /workspaces/mainframe/src/mainframe/frontend

