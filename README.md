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
- Python 3.11+
- Django 5.x with Django REST Framework
- PostgreSQL
- Redis + Huey (task queue)
- Gunicorn

**Frontend:**
- React 18
- Vite 6
- Vitest 4
- Redux Toolkit
- Bootstrap 4
- Leaflet maps
- Chart.js / amCharts

**Infrastructure:**
- Google Cloud Run
- Sentry (error tracking)
- Logfire (observability)

## Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL
- Redis

## Development Setup

### Using Dev Container (Recommended)

Open this repository in VS Code with the Dev Containers extension or in Gitpod. The dev container includes Python 3.12 and Node.js 20, and automatically installs dependencies via uv. Its post-create script generates the git-ignored `src/mainframe/.env` file using `.devcontainer/scripts/set-local-env-vars.sh`; in Codespaces, it adds the backend hostname to `ALLOWED_HOSTS`.

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
   npm ci --prefix frontend
   ```

4. **Configure environment:**
   Create `src/mainframe/.env` with required variables:
   ```shell
   ENV=local
   DEBUG=1
   ALLOWED_HOSTS=localhost,127.0.0.1
   CORS_ALLOW_ALL_ORIGINS=True
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
   # Backend and frontend concurrently
   uv run poe dev

   # Or start them separately
   # Backend (port 8000)
   uv run poe backend

   # Frontend (Vite, port 3000)
   uv run poe frontend

   # Task queue
   uv run poe huey
   ```

In Codespaces, first create a superuser with a unique password by running
`uv run poe createsuperuser` while backend port 8000 is still private. Then
make the port **Public** in the VS Code **Ports** tab; the frontend runs in your
browser and needs to reach the backend through that public URL. The post-create
script adds
`<CODESPACE_NAME>-8000.app.github.dev` to Django's `ALLOWED_HOSTS`, and
`uv run poe frontend` sets the frontend's `VITE_API_URL` to the Codespaces
backend URL. For local development without Poe, run
`cd frontend && npm run dev`; the frontend uses the local backend at
`http://127.0.0.1:8000/`.

## Available Tasks

Tasks are defined using [poethepoet](https://github.com/nat-n/poethepoet) and run via `uv run poe <task>`:

| Command | Description |
|---------|-------------|
| `uv run poe dev` | Start Django and Vite development servers concurrently |
| `uv run poe backend` | Start Django development server |
| `uv run poe frontend` | Start Vite frontend development server on port 3000 |
| `uv run poe huey` | Start Huey task queue worker |
| `uv run poe migrate` | Create and apply database migrations (runs both makemigrations and migrate) |
| `uv run poe shell` | Open Django shell_plus |
| `uv run poe test` | Run pytest |

## Testing

```shell
# Run all tests
uv run poe test

# Run with coverage
uv run poe test --cov=.

# Run specific test file
uv run poe test tests/api/test_views.py
```

### Frontend

```shell
# Run Vitest interactively
cd frontend && npm test

# Run all frontend tests with coverage (writes coverage/lcov.info)
cd frontend && npm run test:ci

# Build for deployment
cd frontend && npm run build
```

The deployment workflow sets `BUILD_PATH=.docker/build` for the frontend build.

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
