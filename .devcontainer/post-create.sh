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

uv run poe manage shell -c \
    "from mainframe.api.user.models import User; \
    User.objects.filter(email='user@test.com').exists() or \
    User.objects.create_superuser('user@test.com', 'user@test.com', 'pass')"
