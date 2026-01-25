# Mainframe

![healthchecks.io](https://healthchecks.io/badge/5a1d5302-e570-47ef-bbbf-50c73b283092/-O8jpQTp.svg)

Personal automation and monitoring platform built with Django REST Framework and React.

## Features

- **Bots** - Telegram bot integrations for notifications and commands
- **Crons** - Scheduled task management with cron expressions
- **Watchers** - Monitor external sources and trigger actions on changes
- **Finance** - Financial tracking and exchange rate monitoring
- **Expenses** - Expense tracking and categorization
- **Earthquakes** - Earthquake monitoring with geographic filtering
- **Devices** - Smart device control (Yeelight integration)
- **Transit Lines** - Public transit information tracking
- **Meals** - Meal planning and tracking

## Tech Stack

**Backend:**
- Python 3.10+
- Django 5.x with Django REST Framework
- PostgreSQL
- Redis + Huey (task queue)
- Gunicorn

**Frontend:**
- React 18
- Redux Toolkit
- Bootstrap 4
- Leaflet maps
- Chart.js / amCharts

**Infrastructure:**
- Google Cloud Run
- Sentry (error tracking)
- Logfire (observability)

## Prerequisites

- Python 3.10+
- Node.js 20+
- PostgreSQL
- Redis

## Development Setup

### Using Dev Container (Recommended)

Open this repository in VS Code with the Dev Containers extension or in Gitpod. The dev container includes Python 3.12 and Node.js 20, and automatically installs dependencies via uv.

### Manual Setup

1. **Install uv:**
   ```shell
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

2. **Install Python dependencies:**
   ```shell
   uv sync
   ```

3. **Install frontend dependencies:**
   ```shell
   cd frontend && npm install
   ```

4. **Configure environment:**
   Create `src/mainframe/.env` with required variables:
   ```shell
   ENV=local
   DEBUG=1
   SECRET_KEY=your-secret-key
   DB_DATABASE=mainframe
   DB_USER=postgres
   DB_PASSWORD=password
   DB_HOST=localhost
   DB_PORT=5432
   REDIS_URL=redis://localhost:6379
   EARTHQUAKE_DEFAULT_COORDINATES=45.0,25.0
   ```

5. **Run database migrations:**
   ```shell
   uv run poe migrate
   ```

6. **Start development servers:**
   ```shell
   # Backend (port 8000)
   uv run poe dev

   # Frontend (port 3000)
   uv run poe frontend

   # Task queue
   uv run poe huey
   ```

## Available Tasks

Tasks are defined using [poethepoet](https://github.com/nat-n/poethepoet) and run via `uv run poe <task>`:

| Command | Description |
|---------|-------------|
| `uv run poe dev` | Start Django development server |
| `uv run poe frontend` | Start React development server |
| `uv run poe huey` | Start Huey task queue worker |
| `uv run poe migrate` | Create and apply database migrations |
| `uv run poe shell` | Open Django shell_plus |
| `uv run poe test` | Run pytest |

## Testing

```shell
# Run all tests
uv run poe test

# Run with coverage
uv run pytest tests --cov=.

# Run specific test file
uv run pytest tests/api/test_views.py
```

## Code Quality

Pre-commit hooks are configured for:
- Ruff (linting and formatting)
- JSON/YAML/TOML validation
- Migration checks

Install hooks:
```shell
uv run pre-commit install
```

Run manually:
```shell
uv run pre-commit run --all-files
```

## Database Operations

### Backup individual app data
```shell
python src/manage.py dumpdata <app_name> --verbosity=2 -o $(date +%Y_%m_%d_%H_%M_%S)_<app_name>.json
python src/manage.py loaddata <dump_name>.json --app=<app_name> --verbosity=2
```

### Backup entire database
```shell
pg_dump -U $DB_USER -p $DB_PORT -h $DB_HOST --column-insert --data-only $DB_DATABASE > $(date +%Y_%m_%d_%H_%M_%S)_mainframe_dump.sql
psql -U $DB_USER -p $DB_PORT -h $DB_HOST -d $DB_DATABASE < <dump_name>.sql
```

## Project Structure

```text
mainframe/
├── src/
│   ├── mainframe/
│   │   ├── api/           # REST API endpoints
│   │   ├── bots/          # Telegram bot handlers
│   │   ├── clients/       # External service clients
│   │   ├── core/          # Django settings and base config
│   │   ├── crons/         # Scheduled tasks
│   │   ├── devices/       # Smart device integrations
│   │   ├── earthquakes/   # Earthquake monitoring
│   │   ├── exchange/      # Currency exchange rates
│   │   ├── expenses/      # Expense tracking
│   │   ├── finance/       # Financial data
│   │   ├── meals/         # Meal tracking
│   │   ├── sources/       # Data source definitions
│   │   ├── transit_lines/ # Transit information
│   │   └── watchers/      # Change monitoring
│   └── manage.py
├── frontend/              # React application
├── tests/                 # Test suite
├── deploy/                # Deployment scripts and configs
└── pyproject.toml         # Python project configuration
```

## Deployment

The project deploys to Google Cloud Run via GitHub Actions. On push to `main`:

1. Security scan runs (Safety CLI)
2. Pre-commit checks execute
3. Tests run against PostgreSQL
4. Backend builds and deploys to Cloud Run
5. Frontend builds and deploys to Cloud Run (if changed)

Telegram notifications are sent at each stage.

## License

MIT License - see [LICENSE.md](LICENSE.md)
