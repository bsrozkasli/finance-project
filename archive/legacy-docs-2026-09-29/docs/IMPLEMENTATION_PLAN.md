# Implementation Plan

This plan is the default workflow for Codex and other AI agents working in this repository.

## Project Baseline

- Monorepo runtime parts:
  - `backend/`: Spring Boot 3.4, Java 17, Maven wrapper.
  - `data-service/`: FastAPI analytics and proxy service.
  - `frontend/`: Vite, React, TypeScript.
- Fixed local ports:
  - Backend: `8080`
  - Data-service: `8000`
  - Frontend: `5173`
  - PostgreSQL: `5433`
  - Redis: `6379`
- Main request path:
  - `frontend/src/api/client.ts`
  - Spring backend under `http://localhost:8080/api/v1`
  - PostgreSQL, Redis, data-service, and external finance APIs.

## Before Any Code Change

1. Read `AGENTS.md`, `CONTRIBUTING.md`, and the relevant docs under `docs/`.
2. Identify the runtime part being changed: backend, data-service, frontend, or docs only.
3. Check current worktree state with `git status --short`.
4. Inspect the existing implementation near the intended change.
5. Confirm whether endpoint shapes, DTO names, ports, or persisted schema will change.
6. For frontend UI work, read the active Google Stitch project before editing.
7. Write down the intended scope and validation commands.

## Backend Implementation Order

1. Define or extend pure domain model/use-case behavior only when the business rule belongs in the backend domain.
2. Add or extend outbound port interfaces under `domain/port/outbound` when the domain needs external capability.
3. Register pure use cases in `DomainConfig.java`.
4. Implement Spring adapters under `adapter/*`.
5. Use MapStruct mappers for DTO/entity/domain mapping when mapping complexity exists.
6. Add tests near the touched layer.

Do not add Spring annotations to domain models or pure use cases unless the project-wide architecture is intentionally changed.

## Frontend Implementation Order

1. Read `FRONTEND_ROADMAP.md`.
2. Read the active Google Stitch project, every relevant screen, design system, and design tokens.
3. Compare Stitch with the current React implementation.
4. Preserve backend endpoint shapes unless coordinated with backend changes.
5. Keep API calls in hooks or API modules, not inside presentational components.
6. Reuse design tokens from `frontend/src/index.css`.
7. Validate responsive behavior and accessibility.

## Data-Service Implementation Order

1. Locate the router and service that already owns the behavior.
2. Keep endpoints read-only unless a documented backend contract requires otherwise.
3. Keep yfinance and pandas-ta data handling inside service modules, not routers.
4. Preserve `TechnicalAnalysisService.MIN_CANDLES` behavior for technical analysis.
5. Add or update pytest coverage near the touched service.

## Validation Commands

Run from the listed directories:

```powershell
cd backend
.\mvnw.cmd test
```

```powershell
cd data-service
python -m pytest
```

```powershell
cd frontend
npm run lint
npm run build
```

On macOS/Linux, use `./mvnw test` for backend.

## Done Criteria

- Code compiles or the failure is documented with the exact error.
- Tests relevant to the changed layer pass.
- Frontend changes pass lint and build.
- API contracts remain compatible or all consumers are updated.
- No secrets are committed.
- No unrelated user changes are reverted.
