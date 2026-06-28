# Data-Service Rules

The data-service is a FastAPI service for analytics, technical analysis, proxying market data, and agent reasoning.

## Responsibilities

- Calculate technical indicators with yfinance, pandas, and pandas-ta.
- Provide read-only analytics/proxy endpoints.
- Support backend workflows that need market analytics.
- Run metrics-first agent analysis where the backend supplies computed quantitative context.

## Boundaries

- Keep routers thin.
- Put calculations and data shaping in service modules.
- Do not persist application state from data-service unless a documented architecture change requires it.
- Do not bypass the Spring backend from the frontend for normal application flows.
- Do not introduce endpoint behavior that conflicts with backend API contracts.

## Technical Analysis Rules

- Technical analysis requires at least 30 candles.
- Preserve `TechnicalAnalysisService.MIN_CANDLES`.
- Return clear errors when there is insufficient data.
- Handle empty yfinance responses explicitly.
- Keep indicator calculations deterministic and testable.

## Agent Analysis Rules

- Keep the metrics-first design:
  - Spring aggregates data and computes quantitative metrics.
  - FastAPI runs the metrics-only multi-agent reasoning pipeline.
- Do not make agents fetch hidden data that the backend contract does not provide unless the architecture docs are updated.
- Keep LLM/API keys in environment variables, never source code.

## Dependency Rules

- Prefer existing dependencies in `requirements.txt`.
- Be careful with compiled dependencies on Windows.
- Do not add heavy analytics libraries without documenting why the existing stack is insufficient.

## Data-Service Validation

From `data-service/`:

```powershell
python -m pytest
```

If imports fail, confirm the command is run from `data-service/` and use module syntax instead of plain `pytest`.
