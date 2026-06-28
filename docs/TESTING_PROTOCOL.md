# Testing Protocol

This repository uses focused validation per runtime part.

## Backend

Run from `backend/`:

```powershell
.\mvnw.cmd test
```

macOS/Linux:

```bash
./mvnw test
```

Expected coverage style:

- Mockito unit tests for pure services and adapters.
- `@WebMvcTest` for controller slices.
- `@SpringBootTest` for integration coverage.
- Testcontainers for PostgreSQL/Redis-backed integration tests.
- WireMock or mocks for external HTTP services.

Notes:

- Docker must be running for Testcontainers tests.
- Do not write tests that call real FMP, Finnhub, yfinance, or LLM providers.
- For financial calculations, include zero, negative, large value, and rounding cases.

## Frontend

Run from `frontend/`:

```powershell
npm run lint
npm run build
```

Notes:

- `npm run build` runs `tsc -b && vite build`.
- Keep data-fetching behavior in hooks so it can be tested independently.
- Validate responsive UI and Stitch consistency for UI changes.

## Data-Service

Run from `data-service/`:

```powershell
python -m pytest
```

Notes:

- Existing tests exercise services directly.
- Add tests near the service being changed.
- Use fixtures or mocks for network data where possible.
- Preserve the minimum 30-candle technical analysis rule.

## When to Run What

- Backend-only change: backend tests.
- Frontend-only change: frontend lint and build.
- Data-service-only change: pytest.
- API contract change: backend tests plus frontend lint/build.
- Backend-to-data-service integration change: backend tests plus data-service pytest.
- Cross-service feature: all three validation command sets.

## Reporting Test Results

Always report:

- Command run.
- Pass/fail status.
- Important failure root cause.
- Whether failure appears environmental, dependency-related, or code-related.
