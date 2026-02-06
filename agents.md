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

```text
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

## Development & Testing

Developer-facing instructions (setup, running services, and test guidance) have been moved to [CONTRIBUTING.md](CONTRIBUTING.md). Agents should still follow the agent-specific sections in this file (tool preambles, todo usage, and behavior guidance).

**Pre-commit Hooks (Required):**

Never bypass pre-commit hooks. Agents and contributors must not use `--no-verify` or other bypasses to skip hooks. Always run `pre-commit run --all-files` locally and fix the issues reported by hooks before committing. Automated agents should surface any hook failures and remediate them rather than bypassing checks.

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

#### Test Organization
- Place test files in `tests/[feature]/test_*.py` mirroring `src/mainframe/[feature]/` structure
- Use pytest with fixtures from `tests/conftest.py`
- Use Factory Boy factories from `tests/factories/` to create test data
- Mock external API calls (see `conftest.py` Gemini example)
- Prefer `unittest.mock` (`mock.patch`, `mock.MagicMock`) for mocking external services rather than `pytest`'s `monkeypatch` to keep mocks explicit and consistent.
- Group related tests for the same class or behavior into `pytest` classes (e.g., `class TestMyFeature:`) to match project style.

#### Test Structure
Tests should follow this pattern for consistency:

```python
import pytest
from rest_framework import status

@pytest.mark.django_db
class TestMyFeature:
    """Descriptive class docstring"""

    def test_success_case(self, client, staff_session):
        """Clear test description"""
        response = client.get("/endpoint/", HTTP_AUTHORIZATION=staff_session.token)
        assert response.status_code == status.HTTP_200_OK

    def test_error_case(self, client):
        """Test error handling"""
        response = client.get("/endpoint/")
        assert response.status_code == status.HTTP_403_FORBIDDEN
```

#### Test Requirements Checklist
For **every new feature** or **API endpoint**, create tests covering:

1. **Success Cases**
   - Happy path with valid data
   - Expected HTTP status code (200, 201, etc.)
   - Response structure and data validation

2. **Permission/Authorization Tests**
   - Authenticated user access (use `session` fixture)
   - Admin-only endpoints (use `staff_session` fixture)
   - Unauthenticated requests return 403
   - Non-admin users get 403 on admin endpoints

3. **Input Validation Tests**
   - Missing required fields return 400
   - Invalid data types return 400
   - Duplicate unique values return 400

4. **Error Handling Tests**
   - Not found errors return 404
   - Conflict errors return 409 or 400
   - Server errors are properly logged

5. **External API Mocking**
   - All external API calls must be mocked using `@mock.patch()`
   - Use `mock.MagicMock()` for return values
   - Mock side effects for error testing with `.side_effect`

#### Example: Complete Test Coverage
```python
import pytest
from unittest import mock
from rest_framework import status

@pytest.mark.django_db
class TestGroupViewSet:
    """Test Group management endpoints"""

    def test_list_groups_success(self, client, staff_session):
        """Test successful group listing"""
      from tests.factories.groups import GroupFactory

      GroupFactory.create(name="test-group")
        response = client.get("/groups/", HTTP_AUTHORIZATION=staff_session.token)
        assert response.status_code == status.HTTP_200_OK

    def test_list_groups_unauthorized(self, client, session):
        """Test non-admin cannot list groups"""
        response = client.get("/groups/", HTTP_AUTHORIZATION=session.token)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_groups_unauthenticated(self, client):
        """Test unauthenticated request denied"""
        response = client.get("/groups/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_group_validation(self, client, staff_session):
        """Test missing required fields"""
        response = client.post("/groups/", data={}, HTTP_AUTHORIZATION=staff_session.token)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @mock.patch("mainframe.api.lights.views.LightsClient.turn_on")
    def test_external_api_mocking(self, mock_turn_on, client, staff_session):
        """Test external API calls are mocked"""
        mock_turn_on.return_value = {"status": "ok"}
        response = client.put("/lights/192.168.1.100/turn-on/", HTTP_AUTHORIZATION=staff_session.token)
        mock_turn_on.assert_called_once_with(ip="192.168.1.100")
```

#### Fixtures Available
- `client` - Django test client
- `db` - Database access marker (add `@pytest.mark.django_db` to use)
- `session` - Regular authenticated user with JWT token
- `staff_session` - Admin user with JWT token for staff endpoints
- `django_assert_num_queries` - Assert database query count (performance testing)

#### Factories Available
Located in `tests/factories/`:
- `UserFactory` - Create test users
- `ActiveSessionFactory` - Create authenticated sessions
- `AccountFactory` - Finance accounts
- `TransactionFactory` - Finance transactions
- `CronFactory` - Scheduled tasks
- And more feature-specific factories

#### Test Execution
```bash
# Run all tests
uv run poe test

# Run specific test file
uv run poe test tests/api/user/test_views.py

# Run specific test class
uv run poe test tests/api/user/test_views.py::TestLogin

# Run specific test method
uv run poe test tests/api/user/test_views.py::TestLogin::test_success

# Run with coverage report
uv run poe test --cov=src/mainframe

# Run with verbose output
uv run poe test -vv

# Run only failing tests
uv run poe test --lf

# Run tests matching pattern
uv run poe test -k "permission"
```

#### Coverage Goals
- **Minimum**: 60% overall
- **Target**: 80%+ overall
- **Critical paths**: 100% (authentication, financial operations, data modifications)

## Database & Migrations

- Migrations stored in `[feature]/migrations/`
- Run: `uv run poe migrate`
- Use `--nomigrations` flag in pytest (migrations don't run during tests)

## Testing Conventions

- **Fixtures**: Defined in `tests/conftest.py` - reusable across tests
- **Factories**: Use Factory Boy in `tests/factories/` for creating test objects
  - Mirror the structure: `tests/factories/[feature].py` for `src/mainframe/[feature]/`
  - Factories handle model relationships and post-generation hooks
  - Do not create model instances directly in tests (for example, avoid `MyModel.objects.create(...)`).
    Use the factories in `tests/factories/` to construct test data instead. If a factory does not
    yet exist for a model you need, add one under `tests/factories/` following the style of the
    existing factories (use post-generation hooks, related factories, and keep naming consistent).
    This helps keep tests consistent and avoids import-time side effects when collecting tests.
- **Mocking**: Mock external APIs and Google Gemini calls
  - Use `@mock.patch()` decorator from `unittest.mock`
  - Always mock third-party API calls (Telegram, Gemini, Yeelight, etc.)
  - Use `mock.MagicMock()` for creating response objects
- **Socket Blocking**: Tests run with socket disabled - only local connections allowed
  - Sockets to external hosts will fail - this is intentional
  - All HTTP calls to external services must be mocked
- **DB**: Test database is reused across test runs for speed
  - Use `@pytest.mark.django_db` decorator on test classes
  - Changes are rolled back between test runs
  - Use `--nomigrations` flag for faster execution

### Test File Organization
```text
tests/
├── conftest.py                    # Global fixtures
├── factories/
│   ├── __init__.py
│   ├── authentication.py          # ActiveSession factory
│   ├── user.py                    # User factory
│   ├── [feature].py               # Feature-specific factories
│   └── ...
├── api/
│   ├── authentication/
│   │   └── test_serializers.py   # Auth serializer tests
│   ├── user/
│   │   └── test_views.py         # User endpoint tests
│   ├── groups/
│   │   └── test_viewsets.py      # Group CRUD tests
│   ├── lights/
│   │   └── test_views.py         # Light control tests
│   ├── logs/
│   │   └── test_views.py         # Log viewing tests
│   ├── rpi/
│   │   └── test_views.py         # RPi control tests
│   ├── commands/
│   │   └── test_views.py         # Command execution tests
│   └── huey_tasks/
│       └── test_views.py         # Task queue tests
├── bots/                          # Bot-related tests
├── crons/                         # Cron-related tests
├── finance/                       # Finance-related tests
├── watchers/                      # Watcher-related tests
└── ...
```

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
  - Make names intuitive and self-documenting
  - Prefer `validate_email()` over `check()`, `fetch_user_transactions()` over `get_data()`
  - Classes should describe what they represent: `UserSerializer`, `PaymentProcessor`, `EmailValidator`
- **Imports**: Organize as: stdlib → third-party → local imports
- **Type Hints**: Add where practical (not required but encouraged)
- **Tests**: Aim for >80% coverage, test API endpoints and business logic
- **Docstrings & Comments**:
  - **Prefer self-documenting code**: Intuitive method/function/class names reduce the need for docstrings
  - **Only document when non-obvious**: Skip docstrings for simple getters/setters, basic CRUD operations, or methods where the name clearly describes the behavior
  - **Use docstrings for complex logic**: Document *why* not what - explain non-obvious algorithms, business rules, or design decisions
  - **Example**: `def calculate_compound_interest(principal, rate, periods)` needs no docstring; `def parse_custom_date_format(date_str)` likely does (explain the format)
  - **Comments for the why**: Use inline comments to explain reasoning, not to restate the code
    ```python
    # Good - explains why
    # Retry logic needed because API is eventually consistent (typical 100ms delay)
    for attempt in range(3):
        result = fetch_status()
        if result.ready:
            break
        time.sleep(0.1)

    # Bad - just restates the code
    # Loop 3 times
    for attempt in range(3):
        ...
    ```
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

**Last Updated**: February 2026

This document is maintained for AI agents. Suggest improvements by opening a PR.
