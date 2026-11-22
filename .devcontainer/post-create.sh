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
    user, _ = User.objects.get_or_create( \
        email='user@test.com', \
        defaults={'username': 'user@test.com'} \
    ); \
    user.username = 'user@test.com'; \
    user.is_active = True; \
    user.is_staff = True; \
    user.is_superuser = True; \
    user.set_password('pass'); \
    user.save()"
