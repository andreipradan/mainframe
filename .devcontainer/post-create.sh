#!/bin/bash
set -e

./.devcontainer/scripts/set-local-env-vars.sh
./.devcontainer/scripts/install-uv.sh
./.devcontainer/scripts/install-postgres.sh
./.devcontainer/scripts/install-redis.sh

git config --unset-all core.hooksPath || true

uv run poe migrate
uv run pre-commit install
npm run install:all
