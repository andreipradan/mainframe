# Contributing

This file contains developer-facing contribution and testing guidelines for the Mainframe project.

## Development Workflow

- Install dependencies: `uv sync`
- Configure environment: edit `src/mainframe/.env` (see README.md template)
- Run migrations: `uv run poe migrate`

## Running Tests

- Run all tests: `uv run poe test`
- Run a specific test file: `uv run poe test tests/path/to/test_file.py`
- With coverage: `uv run poe test --cov=src/mainframe`
- Tests use `--nomigrations` and `--reuse-db` for faster runs; external HTTP calls are disabled.

## Adding New Features

1. Create an app: `uv run poe startapp <name>`
2. Add it to `INSTALLED_APPS` in `src/mainframe/core/settings.py`
3. Add ViewSets / Serializers / Routers following existing patterns

## Tests

- Place tests in `tests/<feature>/test_*.py` mirroring `src/mainframe/<feature>/`.

Notes on Test Placement and Naming
---------------------------------
- Tests should mirror the `src/mainframe/` layout where practical. For example,
	- code in `src/mainframe/earthquakes/...` -> tests in `tests/earthquakes/...`
	- code in `src/mainframe/clients/finance/...` -> tests in `tests/clients/finance/...`
- Test filenames should follow the `test_*.py` pattern and be grouped by feature
	(e.g. `tests/earthquakes/test_check_infp.py`). When adding small, focused
	tests covering cross-cutting concerns (like timezone handling) it's acceptable
	to add `test_*_timezones.py` under the corresponding feature folder, but
	prefer placing tests close to the module they exercise for discoverability.

- Use fixtures from `tests/conftest.py` and Factory Boy factories from `tests/factories/`.
- Mock all external API calls (HTTP, Telegram, Gemini, Yeelight).
- Use `@pytest.mark.django_db` for DB tests.
 - Do not create model instances directly in tests (for example, avoid `MyModel.objects.create(...)`).
	 Use the Factory Boy factories in `tests/factories/` to create test data instead. If a factory
	 does not exist for a model you need in tests, add one under `tests/factories/` following the
	 style of the existing factories (use post-generation hooks, related factories, and keep naming
	 consistent). This keeps tests consistent and reduces import-time side effects.

## Code Conventions

- Use `snake_case` for functions/variables and `PascalCase` for classes.
- Organize imports: stdlib → third-party → local imports.
- **Do not import inside functions or methods**; imports must be top-level. This keeps import side-effects consistent and avoids Django app-loading issues during test collection.
- Prefer type hints where practical.
- Keep code self-documenting; add docstrings only for non-obvious logic.

## Style

- Follow existing project patterns in tests: concise docstrings, use fixtures, avoid top-level network calls.
- Use `unittest.mock` (`mock.patch`, `mock.MagicMock`) for mocking external APIs instead of pytest's `monkeypatch` fixture to keep mocks explicit and consistent across tests.
- Group related tests for the same class or behaviour into `pytest` test classes (e.g., `class TestMyModel:`) to match the project's existing test organization.

## Useful Commands

```bash
# Run backend
uv run poe dev

# Run tests
uv run poe test
uv run poe test --cov=src/mainframe
```

---
Last updated: February 2026
