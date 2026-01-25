# Agents Documentation

**This document is for AI agents and LLMs working on the Mainframe codebase.**

## Overview

Mainframe is a personal automation and monitoring platform built with Django REST Framework (backend) and React (frontend). It integrates Telegram bots, scheduled tasks, external data monitoring, and smart home control into a unified system.

### Purpose
- Monitor external sources and trigger automated actions
- Manage scheduled tasks and integrations
- Track financial data, expenses, earthquakes, and more
- Control smart devices via REST API
- Provide real-time notifications through Telegram bots

### Tech Stack
- **Backend**: Python 3.10+ / Django 5.x / Django REST Framework
- **Frontend**: React 18 / Redux Toolkit / Bootstrap 4 / Leaflet
- **Database**: PostgreSQL
- **Task Queue**: Redis + Huey
- **Monitoring**: Sentry + Logfire
- **Deployment**: Google Cloud Run

## Project Structure

```
src/mainframe/           # Django backend
├── api/               # REST API endpoints
│   ├── user/         # User management & authentication
│   ├── authentication/ # JWT tokens, sessions
│   ├── commands/     # Command definitions & execution
│   ├── groups/       # User groups & permissions
│   ├── hooks/        # Event hooks system
│   ├── huey_tasks/   # Task queue management
│   ├── lights/       # Smart light control (Yeelight)
│   ├── logs/         # Activity logging
│   └── rpi/          # Raspberry Pi integration
├── core/             # Django settings, URLs, middleware
├── bots/             # Telegram bot models & handlers
├── crons/            # Scheduled task definitions (cron expressions)
├── devices/          # Smart device management
├── earthquakes/      # Earthquake monitoring
├── exchange/         # Currency exchange rates
├── expenses/         # Expense tracking
├── finance/          # Financial tracking & analysis
├── meals/            # Meal planning
├── sources/          # External data source management
├── transit_lines/    # Public transit information
├── watchers/         # Change monitoring system
└── clients/          # Third-party API clients (Gemini, Telegram, etc.)

frontend/              # React application
├── src/
│   ├── api/         # API service calls
│   ├── app/         # React components & pages
│   ├── redux/       # Redux store & slices
│   └── assets/      # Images, styles
└── public/          # Static assets

tests/                # Pytest test suite
├── api/             # API endpoint tests
├── bots/            # Bot functionality tests
├── factories/       # Factory Boy model factories
└── [feature]/       # Feature-specific tests
```

## Architecture & Key Patterns

### API Design
- **REST Framework ViewSets**: Used for resource endpoints (e.g., `BotViewSet`, `MessageViewSet`)
- **Permission Classes**: `IsAdminUser`, `AllowAny` - control access by endpoint
- **Serializers**: Convert models to/from JSON
- **Routers**: Auto-generate URLs from ViewSets (see `src/mainframe/[feature]/routers.py`)

### Data Models
- All models inherit from `TimeStampedModel` (provides `created_at`, `updated_at`)
- Models use Django ORM with PostgreSQL
- ArrayField used for flexible data (e.g., bot whitelists)

### Task Queue (Huey)
- Async task execution via Redis
- Defined in `[feature]/tasks.py`
- Triggered from API endpoints or cron jobs
- Status tracked in `mainframe.api.huey_tasks.models`

### Telegram Bots
- Bot model stores credentials and webhook URL
- Messages logged in `Message` model
- Handlers can access bot via `bot.telegram_bot` property
- Webhook validates requests before processing

### Watchers System
- Monitors external sources for changes
- Triggers actions when conditions are met
- Integrates with task queue for notifications

## Development Workflow

### Setup
```bash
# Install dependencies (uses uv - ultra-fast Python package manager)
uv sync

# Configure environment (see README.md for .env template)
# Edit src/mainframe/.env with required variables

# Run migrations
uv run poe migrate

# Create admin user
uv run poe createsuperuser
```

### Running Services
```bash
# Backend API (port 8000)
uv run poe dev

# Frontend React (port 3000)
uv run poe frontend

# Task queue worker
uv run poe huey
```

### Running Tests
```bash
# All tests with pytest
uv run poe test

# Specific test file
uv run poe test tests/api/user/test_views.py

# With coverage
uv run poe test --cov=src/mainframe

# Tests use --nomigrations (faster), --reuse-db (persistent), --disable-socket (no external calls)
```

## Adding New Features

### Adding a New App Module
1. ```bash
cd src/mainframe
uv run poe startapp <name>
```
2. Add to `INSTALLED_APPS` in [core/settings.py](src/mainframe/core/settings.py)

### Adding an API Endpoint
1. Create ViewSet in `src/mainframe/[feature]/views.py`
2. Create corresponding Serializer in `serializers.py`
3. Register in `routers.py` using DRF router
4. Import and include router in [core/urls.py](src/mainframe/core/urls.py)

**Example ViewSet:**
```python
from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser

class MyModelViewSet(viewsets.ModelViewSet):
    queryset = MyModel.objects.all()
    serializer_class = MyModelSerializer
    permission_classes = (IsAdminUser,)
```

### Adding Tests
1. Place test files in `tests/[feature]/test_*.py`
2. Use pytest with fixtures from `tests/conftest.py`
3. Use Factory Boy factories from `tests/factories/` to create test data
4. Mock external API calls (see `conftest.py` Gemini example)

**Example Test:**
```python
def test_user_creation(db):
    user = User.objects.create(email="test@example.com")
    assert user.is_active == True
```

## Database & Migrations

- Migrations stored in `[feature]/migrations/`
- Run: `uv run poe migrate`
- Use `--nomigrations` flag in pytest (migrations don't run during tests)

## Testing Conventions

- **Fixtures**: Defined in `tests/conftest.py` - reusable across tests
- **Factories**: Use Factory Boy in `tests/factories/` for creating test objects
- **Mocking**: Mock external APIs and Google Gemini calls
- **Socket Blocking**: Tests run with socket disabled - only local connections allowed
- **DB**: Test database is reused across test runs for speed

Key fixtures:
- `db` - Django database access
- `session` - Active user session with JWT token
- `staff_session` - Staff user session for admin endpoints

## Common Workflows

### Querying Data from an Endpoint
```python
# GET /api/bots/
# Returns all Bot objects with permission check

# GET /api/messages/?author=TelegramBot&chat_id=123456
# Uses filter_backends for query params
```

### Async Task Execution
```python
from mainframe.bots.tasks import send_notification

# Queue task to run async
send_notification.delay(chat_id=123, text="Hello!")
```

## Code Conventions & Best Practices

- **Naming**: Use snake_case for functions/variables, PascalCase for classes
- **Imports**: Organize as: stdlib → third-party → local imports
- **Type Hints**: Add where practical (not required but encouraged)
- **Tests**: Aim for >80% coverage, test API endpoints and business logic
- **Docstrings**: Use for complex functions and classes
- **Logging**: Use `logging.getLogger(__name__)` per module
- **No Hardcoded Values**: Use environment variables and settings
- **DRY Principle**: Extract common logic into utilities and base classes

## Common Gotchas

1. **Socket Disabled in Tests**: Tests can't make external HTTP calls. Mock all external APIs.
   - Use `@patch("module.function")` decorator
   - See `conftest.py` for Gemini API mocking example

2. **Migrations in Tests**: Tests use `--nomigrations` flag - schema changes don't auto-apply.
   - Define models correctly on first try or create explicit migrations

3. **Permission Classes**: Always set `permission_classes` on ViewSets.
   - Default to `[IsAdminUser]` if uncertain
   - Override `get_permissions()` for mixed-permission endpoints

4. **AsyncIO in Huey**: Tasks run in separate process - can't share thread-local data.
   - Pass all needed data as task parameters
   - Use `task.delay()` not `task()` for async execution

5. **PostgreSQL Specifics**: Project uses Postgres-specific fields (ArrayField, JSON).
   - Won't work with SQLite
   - Use `django.contrib.postgres` in INSTALLED_APPS

6. **Redis Requirement**: Huey task queue requires Redis running.
   - Tests mock Redis calls
   - Dev/prod requires actual Redis connection

## Useful Commands

```bash
# Development
uv run poe dev              # Start backend
uv run poe frontend         # Start frontend
uv run poe huey             # Start task queue worker

# Database
uv run poe migrate          # Create and Apply migrations
uv run poe shell            # Launches a django shell_plus

# Testing
uv run poe test             # Run all tests
uv run poe test [path]      # Run specific tests
uv run poe test --cov       # With coverage report

# Admin
uv run poe createsuperuser  # Create admin user
uv run poe shell            # Django shell
```

(Check `pyproject.toml` for complete `[tool.poe.tasks]` definitions)

## Debugging Tips

- **Django Shell**: `uv run poe shell` for interactive Python with models loaded
- **Logging**: Check logs in settings - Logfire and Sentry capture production errors
- **Test Failures**: Use `pytest -vv` for verbose output, `-k [pattern]` to run specific tests
- **Database**: Use `uv run poe dbshell` to inspect data directly

## Resources & Documentation

- [Django REST Framework Docs](https://www.django-rest-framework.org/)
- [Django Documentation](https://docs.djangoproject.com/)
- [React Documentation](https://react.dev/)
- [Huey Task Queue Docs](https://huey.readthedocs.io/)
- [Pytest Documentation](https://docs.pytest.org/)

---

**Last Updated**: January 2026

This document is maintained for AI agents. Suggest improvements by opening a PR.
