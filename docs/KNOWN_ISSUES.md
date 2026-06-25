# Known Issues

This document records practical issues that agents should check before assuming code is broken.

## Docker Required for Backend Integration Tests

Backend tests may use Testcontainers for PostgreSQL and Redis-backed integration coverage.

Symptom:

- `Failed to load ApplicationContext`
- Testcontainers startup errors
- Docker connection errors

Fix:

- Start Docker Desktop or the local Docker daemon.
- Re-run:

```powershell
cd backend
.\mvnw.cmd test
```

## Data-Service Import Path

Running plain `pytest` from the wrong directory can fail with import errors.

Fix:

```powershell
cd data-service
python -m pytest
```

## Python Compiled Dependencies on Windows

Packages used by analytics and optimization may require compatible Python versions and C++ build tools.

Preferred Python versions:

- Python 3.10
- Python 3.11

If installation fails for compiled packages, verify Visual Studio Build Tools with C++ workload.

## Technical Analysis Requires Enough Candles

Technical analysis requires at least 30 candles through `TechnicalAnalysisService.MIN_CANDLES`.

Symptom:

- HTTP 400 or controlled service error for short ranges.

Fix:

- Request a longer range.
- Do not remove the candle minimum.

## Frontend Build Native Dependency Errors

Vite/Tailwind native packages can fail in restricted environments.

Symptom:

- Native dependency load failure.
- `spawn EPERM`.

Fix:

- Re-run in a normal local shell.
- Confirm dependencies are installed under `frontend/node_modules`.
- Re-run:

```powershell
cd frontend
npm run build
```

## Documentation Encoding

Some existing markdown files contain mojibake from earlier encoding issues.

Rule:

- Do not rewrite unrelated documentation only to fix encoding unless requested.
- New documentation should use plain UTF-8/ASCII-compatible Markdown.

## Stitch Access

Frontend roadmap compliance requires reading the active Google Stitch project.

If Stitch is unavailable:

- Do not claim full Stitch parity.
- Use existing frontend tokens and components.
- Document that UI verification against Stitch was not completed.
