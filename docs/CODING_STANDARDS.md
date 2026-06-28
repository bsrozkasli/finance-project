# Coding Standards

These standards apply to all agents and contributors.

## General

- Keep changes focused.
- Preserve public API contracts unless consumers are updated.
- Do not commit secrets.
- Prefer existing project patterns over new abstractions.
- Add abstractions only when they reduce real duplication or complexity.
- Keep code testable.
- Update docs when behavior or workflow changes.

## Backend Java

- Use Java 17.
- Keep domain code framework-free.
- Use `BigDecimal` for financial calculations.
- Avoid returning `null`; prefer explicit empty collections, `Optional`, or controlled errors.
- Keep controllers thin.
- Keep scheduled jobs thin.
- Use ports for outbound capabilities.
- Register pure use cases in `DomainConfig.java`.
- Prefer MapStruct for mapping in adapters/controllers.

## Frontend TypeScript

- Avoid `any`.
- Keep API calls in `frontend/src/api` or hooks.
- Keep presentational components typed and reusable.
- Format financial values with `Intl.NumberFormat`.
- Keep chart data structures typed.
- Use design tokens from `frontend/src/index.css`.
- Follow Stitch for UI decisions.

## Data-Service Python

- Keep routers thin and services testable.
- Avoid hidden network calls in tests.
- Handle empty dataframes and insufficient candle counts explicitly.
- Keep secrets in environment variables.
- Prefer existing dependencies.

## File and Naming Guidance

- Tests should live near the layer they validate.
- Use clear names that match domain language.
- Do not introduce duplicate names for the same concept.
- Keep DTO names stable when they are part of an API contract.

## Validation Commands

Backend:

```powershell
cd backend
.\mvnw.cmd test
```

Frontend:

```powershell
cd frontend
npm run lint
npm run build
```

Data-service:

```powershell
cd data-service
python -m pytest
```
