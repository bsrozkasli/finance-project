# AGENTS.md

## Project shape
- Monorepo with 3 runtime parts: `backend/` (Spring Boot 3.4 + Java 17), `data-service/` (FastAPI), and `frontend/` (Vite + React + TypeScript).
- Main flow: `frontend/src/api/client.ts` calls the Spring backend on `http://localhost:8080/api/v1`; the backend then reads/writes PostgreSQL, caches in Redis, and can call the local FastAPI data-service or the external FMP API.
- Dev ports are fixed in code/config: backend `8080`, data-service `8000`, Vite `5173`, Postgres `5433`, Redis `6379`.

## Architecture rules to preserve
- Backend follows hexagonal architecture: pure domain in `backend/src/main/java/.../domain`, ports in `domain/port/outbound`, Spring adapters in `adapter/*`.
- Keep domain models framework-free: see `domain/model/Asset.java` and `domain/model/PriceHistory.java` (both enforce invariants in constructors).
- Register pure use cases through `backend/src/main/java/.../config/DomainConfig.java`; do not add Spring annotations to domain services unless the pattern changes project-wide.
- Prefer MapStruct mappers over hand-written mapping in controllers/adapters (`adapter/**/mapper/*`).

## Cross-service behavior
- `PriceController` implements lazy history loading: it reads from DB first, then falls back to `DataServicePriceAdapter`, then persists the fetched series.
- `AssetController` batch-adds symbols, tries FMP metadata first, and falls back to a minimal `STOCK` asset when FMP returns nothing.
- `data-service/main.py` and `app/routers/analysis.py` are read-only analytics/proxy endpoints built on `yfinance` + `pandas-ta`; technical analysis requires at least 30 candles (`TechnicalAnalysisService.MIN_CANDLES`).

## Configuration and environment
- Backend reads `.env` at startup via `dotenv-java` in `FinanceProjectApplication.java`; the expected variables are listed in `.env.example` (`DB_*`, `REDIS_*`, `FMP_API_KEY`).
- Backend config lives in `backend/src/main/resources/application.yml`; Redis cache is enabled there and `WebConfig` allows the Vite dev server origin for `/api/**`.
- `docker-compose.yml` spins up Postgres, Redis, and the FastAPI data-service for local development.

## Testing/workflow commands
- Backend: run from `backend/` with Maven wrapper; use `mvnw test` for the full suite. Tests mix Mockito unit tests, `@WebMvcTest` controller slices, and `@SpringBootTest` integration tests with Testcontainers/WireMock.
- Data-service: run from `data-service/` with `pytest`; the existing tests exercise `TechnicalAnalysisService` directly.
- Frontend: run from `frontend/` with `npm run lint` and `npm run build` (build is `tsc -b && vite build`).

## Frontend conventions
- `frontend/src/index.css` defines the design tokens; keep new UI consistent with those CSS variables.
- Axios base URL is hard-coded in `frontend/src/api/client.ts`; if backend routing changes, update this file and the Vite proxy in `frontend/vite.config.ts` together.
- `Dashboard.tsx` composes the page from `AssetGrid`, `ChartOverlay`, and `RightSidebar`; state is lifted there, while hooks own data fetching.

## When editing
- Preserve endpoint shapes and DTO field names unless you also update the frontend consumers.
- Keep scheduled jobs thin: `PriceIngestionJob` should delegate to `PriceIngestionUseCase` only.
- Update or add tests near the touched layer using the existing style and fixture patterns.

