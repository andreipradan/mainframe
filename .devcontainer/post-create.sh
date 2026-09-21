#!/bin/bash
set -e

./.devcontainer/scripts/set-local-env-vars.sh
./.devcontainer/scripts/install-uv.sh
./.devcontainer/scripts/install-postgres.sh
./.devcontainer/scripts/install-redis.sh

git config --unset-all core.hooksPath || true

uv sync --no-build
uv run --no-build poe migrate
uv run --no-build pre-commit install
npm run install:all

uv run --no-build poe manage shell -c \
    "from mainframe.api.user.models import User; \
    User.objects.filter(email='user@test.com').exists() or \
    User.objects.create_superuser('user@test.com', 'user@test.com', 'pass')"
