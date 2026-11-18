# Frontend Migration Plan: Create React App to Vite

**Status:** Draft for review
**Scope:** Replace the frontend development/build tooling; preserve existing application behavior.

## Recommendation

Move this client-rendered React application from Create React App (CRA) to Vite with `@vitejs/plugin-react`. Keep React 18, React Router 5, Redux, the current page structure, and the Django API contract. Do not combine this work with a router, React, styling, or UI redesign.

CRA 5.0.1 declares `webpack-dev-server` `^4.6.0`, while the frontend currently forces version 6.1.0 through an npm override. That major-version mismatch causes `react-scripts start` to reject `onAfterSetupMiddleware`. CRA is deprecated, so the migration should remove the unsupported dependency combination rather than maintain a local patch to CRA.

## Target Behavior

- `uv run poe frontend` starts the Vite development server on port 3000, preserving the existing Codespaces frontend URL.
- API requests continue to target backend port 8000.
- In Codespaces, the user manually makes backend port 8000 Public in the VS Code **Ports** tab and `ALLOWED_HOSTS` includes `<CODESPACE_NAME>-8000.app.github.dev`.
- `npm run build` continues to produce output at the path expected by the existing Docker and deployment workflow.
- Existing routes, Redux state, styling, assets, authentication, and tests retain their current behavior.

## Phase 1: Establish a Baseline

1. Record the current frontend test and coverage results, production build result, Node/npm versions, and current dependency audit findings.
2. Inventory existing CRA-specific behavior before changing tooling:
   - Environment variables: `REACT_APP_API_URL`, `REACT_APP_NGROK_URL`, `NODE_ENV`, and `PUBLIC_URL`.
   - The CRA HTML template and public assets under `frontend/public`.
   - Static asset `require()` calls in production components.
   - Sass imports using the webpack `~` package prefix.
   - Jest configuration and `src/setupTests.js`.
   - The CI build's `BUILD_PATH=.docker/build`, the Dockerfile's `COPY build`, and the Nginx SPA fallback.
3. Keep the existing security overrides unless a replacement is verified. In particular, do not blindly downgrade the WDS override that was added during Dependabot remediation.

## Phase 2: Add Vite for Development and Production Builds

1. Add Vite and `@vitejs/plugin-react` at versions compatible with both local Node and the CI Node version.
2. Add `vite.config.js` with:
   - The React plugin.
   - A `/` base path, matching the current site deployment.
   - `build.outDir` set from `BUILD_PATH` when supplied, otherwise `build`. This preserves the existing CI/Docker output contract.
   - A development server bound to `0.0.0.0`, using port 3000 with strict port selection.
   - A narrowly scoped Codespaces `allowedHosts` entry derived from `CODESPACE_NAME`; do not allow arbitrary hosts.
3. Move the CRA HTML entry template from `frontend/public/index.html` to `frontend/index.html`. Keep the root element, metadata, and TinyMCE CDN script. Replace the `%PUBLIC_URL%` prefix in the favicon and manifest references with `/`, matching the `/` base path from step 2. Leave other static files in `frontend/public`.
4. Change package scripts so `start`/`dev` runs Vite and `build` runs `vite build`. Keep the existing `format` command.
5. Update the Poe frontend task in `pyproject.toml` to invoke the Vite script and pass `VITE_API_URL` and `VITE_NGROK_URL`. Use the Codespaces backend URL on port 8000.
6. During this phase, retain CRA's Jest test command temporarily so the build-tool change does not also require an immediate rewrite of the test suite. A small Vite `define` compatibility bridge can map the existing `REACT_APP_*` expressions to the new `VITE_*` task variables until Phase 4.

## Phase 3: Migrate CRA-Specific Application Details

1. Replace the `REACT_APP_API_URL` and `REACT_APP_NGROK_URL` reads with Vite environment access, preserving the localhost backend fallback at `http://127.0.0.1:5678/`.
2. Update service-worker environment handling. The app currently unregisters its service worker; preserve that behavior and ensure any previously installed CRA worker cannot keep serving stale assets. Use Vite's production/base URL values rather than CRA's `PUBLIC_URL`.
3. Replace production-source static `require()` calls for images with explicit imports (or Vite-supported `new URL(..., import.meta.url)` references). Do not change test-only `require()` calls in this phase.
4. Remove webpack-only `~` prefixes from package imports in `App.scss`, preserving Sass import order and Bootstrap variable overrides.
5. Verify asset paths, public files, fonts, Leaflet images, and the TinyMCE CDN script in both development and production builds.
6. Keep the existing `ReactDOM.render` behavior unless a separate React 18 root migration is approved; it is not needed to adopt Vite.

## Phase 4: Move Tests to Vitest and Remove CRA

The frontend currently has about 46 Jest test files and a shared Jest setup. Vite does not supply a test runner, so complete removal of CRA requires an explicit test-runner migration.

1. Add Vitest, a DOM environment, and coverage support compatible with the selected Vite version.
2. Configure jsdom, `src/setupTests.js` equivalents, CSS/Sass handling, the existing `src` alias, and coverage output at `frontend/coverage/lcov.info`.
3. Migrate Jest globals and APIs (`jest.fn`, `jest.mock`, spies, timers, and mock resets) to Vitest equivalents. Convert test-time CommonJS `require()` of local source modules where Vitest's ESM execution requires it.
4. Preserve the setup behavior for React `act`, Leaflet, `window.scrollTo`, and third-party CSS. Review mock hoisting and module reset semantics instead of assuming Jest and Vitest behave identically.
5. Run the suite in groups, compare failures with the Phase 1 baseline, and keep the existing file-level coverage requirements.
6. Once all tests pass under Vitest, remove `react-scripts`, CRA-only Jest settings/setup, and CRA-specific WDS/WDM overrides that are no longer needed. Re-run the dependency audit and retain the unrelated security overrides.

## Phase 5: CI, Deployment, and Documentation

1. Update `.github/workflows/main.yml` to run the Vitest coverage command and preserve the `lcov.info` artifact path.
2. Keep the production workflow's `BUILD_PATH=.docker/build`. Confirm the Vite output lands at `.docker/build` and the existing Dockerfile/Nginx setup still packages and serves it.
3. Update frontend setup instructions and the Poe task environment-variable names.
4. Keep the Codespaces port procedure explicit: backend port 8000 must be made Public manually in the VS Code **Ports** tab, and the corresponding Codespaces hostname must be in `ALLOWED_HOSTS`. Do not change port visibility programmatically.

## Validation and Acceptance Criteria

- `uv run poe frontend` starts Vite on port 3000 without the WDS schema error.
- Codespaces and localhost builds use backend port 8000; login requests reach Django and pass CORS preflight.
- Direct navigation and refresh on routes such as `/login`, `/dashboard`, and nested finance routes return the SPA.
- Login, staff sidebar expansion/navigation, Redux behavior, modals, charts, maps, and Sass styling work in browser smoke tests.
- All frontend tests pass with coverage; CI uploads coverage to the existing artifact location.
- `npm run build` succeeds both locally and with `BUILD_PATH=.docker/build`; the Docker image serves the app with correct assets and SPA fallback.
- `npm audit` has no newly introduced unresolved issues, and the final lockfile contains no unnecessary CRA/WDS development-server dependencies.
