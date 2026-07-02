# AGENTS.md

> Instruction priority: AGENTS.md > SPEC.md > docs/* > code comments.
> When AGENTS.md and SPEC.md conflict, prefer the rule that is stricter on
> architecture, endpoint compatibility, data integrity, and provider degradation.
> If a conflict cannot be resolved safely, stop and ask before editing.

---

## 1. Project shape

- Monorepo with three runtimes: `backend/` (Spring Boot 3.4 + Java 17),
  `data-service/` (FastAPI + Python), `frontend/` (Vite + React + TypeScript).
- Primary flow: `frontend/src/api/client.ts` → Spring backend `http://localhost:8080/api/v1`
  → PostgreSQL / Redis / FastAPI data-service / external market providers.
- Dev ports are fixed in code and config and must never be changed:

  | Runtime      | Port  |
  |--------------|------:|
  | Backend      | 8080  |
  | Data-service | 8000  |
  | Frontend     | 5173  |
  | PostgreSQL   | 5433  |
  | Redis        | 6379  |

---

## 2. Architecture rules

### Backend — hexagonal
- Pure domain lives in `backend/src/main/java/.../domain`. Models and services
  must remain framework-free; invariants are enforced in constructors.
- Outbound ports live in `domain/port/outbound`. Never bypass a port in a controller.
- Spring-specific code belongs in `adapter/*` or `config/*` only.
- Register pure use cases through `DomainConfig.java`. Do not add `@Service`,
  `@Component`, or other Spring annotations to domain classes unless the pattern
  changes project-wide and all affected classes are updated together.
- Prefer MapStruct mappers in `adapter/**/mapper/*` over hand-written mapping.
- Controllers must be thin: delegate to use cases or ports, never compute domain
  logic inline.
- Scheduled jobs must be thin: `PriceIngestionJob` delegates to `PriceIngestionUseCase`.

### Data-service — analytics/proxy only
- `main.py` owns app startup and the provider-chain price endpoint.
- `app/routers/*` expose API modules. `app/services/*` contain analytics.
  `app/providers/*` isolate provider behavior. `app/models/*` define Pydantic contracts.
- Analytics endpoints are read-only unless an explicit persistence design is added and
  reviewed.
- Technical analysis requires at least `TechnicalAnalysisService.MIN_CANDLES` (30)
  candles. Fewer must return a clear error, not a misleading result.
- Do not add data fetching logic inside agents. Agents receive pre-calculated metrics
  only.

### Frontend
- `App.tsx` owns the browser router; `Dashboard.tsx` composes the routed shell.
- User-facing pages must use React Router paths rather than tab-only state.
  Keep transient UI state such as selected symbol, modals, drawers, filters,
  chart ranges, and table sorting in component state.
- Hooks under `frontend/src/hooks` own all data fetching and loading/error state.
- API types live in `frontend/src/api` or near the hook that uses them.
- Styling must use the CSS variables defined in `frontend/src/index.css`.
- Frontend browser routes and backend API endpoints are separate contracts;
  adding a frontend route must not rename existing `/api/v1` endpoints.
- The Axios base URL in `frontend/src/api/client.ts` and the Vite proxy in
  `frontend/vite.config.ts` must be updated together if backend API routing changes.

---

## 3. Cross-service behavior

- `PriceController` lazy-loads price history: DB first → `DataServicePriceAdapter`
  fallback → persist fetched rows. Do not skip any step.
- `AssetController` batch-add tries Yahoo metadata first, falls back to minimal
  `STOCK` asset. Do not fabricate metadata.
- `AgentAnalysisUseCase` checks Redis cache before calling `DataServiceAgentAnalysisAdapter`.
  On data-service failure, return `Optional.empty()` and degrade gracefully.
  Never return synthetic analysis text.
- Agent order is strictly sequential:
  Fundamental Analyst → Technical Analyst → Risk Analyst →
  Bull Researcher → Bear Researcher → Portfolio Manager.
- Provider failures degrade gracefully: empty lists, `null` optional fields, or
  partial DTOs. Fake market data is forbidden in all contexts.

---

## 4. Do-not-touch list

Never modify these without an explicit task that targets them and confirmation
that all consumers are updated together:

- `frontend/src/api/client.ts` base URL (update with `vite.config.ts` only)
- Any existing endpoint path or DTO field name (update all layers together)
- `DomainConfig.java` registration pattern (do not add Spring annotations to domain)
- Database migration files already applied (`src/main/resources/db/migration/V*`)
- `docker-compose.yml` service port bindings
- `prometheus.yml` scrape targets

---

## 5. Git workflow

### 5.1 Always work on a branch

Never commit directly to `main` or `release/*`. Every task starts by creating
a branch from the appropriate base:

| Task type                      | Base branch   | Branch name format                        |
|-------------------------------|--------------|-------------------------------------------|
| Feature or bugfix              | `main`        | `feat/<short-slug>` or `fix/<short-slug>` |
| Hotfix on a released version   | `release/vX.Y` | `fix/<short-slug>`                       |
| Documentation only             | `main`        | `docs/<short-slug>`                       |
| Dependency or tooling update   | `main`        | `chore/<short-slug>`                      |

Example: `feat/portfolio-rebalance-threshold`, `fix/technical-candle-422`

### 5.2 Atomic commits

Each commit must represent one logical, self-consistent change that passes all
tests on its own. A commit must not leave the repo in a broken state.

Commit message format (Conventional Commits):

```
<type>(<scope>): <short imperative summary>

[optional body: what changed and why, not how]
[optional footer: BREAKING CHANGE or closes #issue]
```

Types: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `perf`

Scopes: `backend`, `data-service`, `frontend`, `infra`, `db`, `agents`

Examples:
```
feat(backend): add rebalance threshold check to portfolio optimizer
fix(data-service): return 422 when candle count < MIN_CANDLES
test(backend): add WebMvcTest for agent-analysis cache eviction
docs(spec): add entity relationship table to section 9
chore(infra): pin postgres image to 15.6 in docker-compose
```

Rules:
- Summary line: ≤72 characters, imperative mood, no trailing period.
- Do not mix unrelated changes in a single commit.
- Do not commit `.env`, secrets, build outputs, `*.class`, `__pycache__`,
  `node_modules`, or generated migration junk.

### 5.3 Pull requests

Every branch must be merged via PR, never with a direct push.

PR title must match the branch name type and be human-readable:
`feat(backend): portfolio rebalance threshold check`

PR description must include:
1. What changed and why (one paragraph).
2. Which runtimes are touched (backend / data-service / frontend / infra).
3. How to verify locally (commands or smoke scenario from section 7).
4. Test evidence: paste the relevant test output or screenshot.

### 5.4 Release branches and merging to main

- A `release/vX.Y` branch is created when a set of features is ready for
  production verification.
- Only code that passes all tests AND all smoke scenarios (section 7) may be
  merged into `main`.
- The merge PR into `main` must be reviewed and approved before merging.
- After merging to `main`, tag the commit: `git tag vX.Y.Z`.
- Do not merge a release branch into `main` if any smoke scenario fails,
  any test suite reports failures, or any breaking change is undocumented.

---

## 6. Testing requirements

### 6.1 What tests to write

Write or update tests close to the changed behavior. Use the existing style
and fixture patterns in the affected runtime.

| Runtime      | Test types expected                                                                 |
|--------------|-------------------------------------------------------------------------------------|
| Backend      | Mockito unit tests for domain/use-case logic; `@WebMvcTest` for controller slices; repository adapter tests; `@SpringBootTest` integration tests with Testcontainers when DB/Redis access is needed |
| Data-service | `pytest` unit tests for service logic; parametrized tests for edge cases (e.g. MIN_CANDLES boundary) |
| Frontend     | `npm run lint` must pass; `npm run build` must pass (type-check included)           |

Coverage expectations per change:
- New use case or service method → at least one happy-path test and one
  error/edge-case test.
- New controller endpoint → `@WebMvcTest` covering 200, relevant 4xx, and
  provider-failure degradation.
- New data-service route → `pytest` covering valid input and at least one
  invalid/edge input.
- Migration or schema change → repository adapter test exercising the new column
  or constraint.

### 6.2 Running tests

```bash
# Backend — from backend/
./mvnw test                         # Unix/macOS
./mvnw.cmd test                     # Windows PowerShell

# Data-service — from data-service/
python -m pytest

# Frontend — from frontend/
npm run lint
npm run build

# Infrastructure validation
docker compose config --quiet
```

All commands for touched runtimes must pass before a PR is ready for review.

---

## 7. Smoke tests

Smoke tests verify that the integrated system works end-to-end. Run them
after infrastructure is up (`docker compose up -d`) and all three runtimes
are running.

A PR targeting `main` (release merge) must demonstrate all smoke scenarios pass.
A feature PR must demonstrate the scenarios that exercise its changed area.

| ID  | Scenario                     | Request                                                               | Pass condition                                                                                   |
|-----|------------------------------|-----------------------------------------------------------------------|--------------------------------------------------------------------------------------------------|
| S1  | Asset batch fallback         | `POST /api/v1/assets/batch` `{"symbols":["AAPL"]}`                   | `200 OK`; response contains `symbol`, `name`, `type`; no invented metadata when provider is missing |
| S2  | Lazy price load              | `GET /api/v1/prices/AAPL/history?interval=1d&range=1mo`              | `200 OK`; candle array with `assetId/open/high/low/close/volume/timestamp`; rows persisted in DB after first call |
| S3  | Provider degradation         | Remove `FINNHUB_API_KEY`; `GET /api/v1/news/AAPL`                    | `200 OK` with `[]` or partial data; no fake news or analyst values                              |
| S4  | Journal persistence          | `POST /api/v1/journal/trades`; restart; `GET /api/v1/journal/trades` | Created trade survives restart with stable `id`, `symbol`, `quantity`, `status`, PnL fields     |
| S5  | Watchlist persistence        | `POST /api/v1/watchlists`; add symbols; restart; `GET /api/v1/watchlists` | Symbols are ordered, normalized, and survive restart through `watchlist_symbols`             |
| S6  | Agent analysis cache         | `GET /api/v1/agent-analysis/AAPL` twice within TTL                   | First call: `fromCache=false`; second call: served from cache; `decision` and `confidence` preserved |
| S7  | Insufficient candles         | Provide < 30 candles; `GET /api/v1/technical/AAPL`                   | Returns `422 Unprocessable Entity`; no misleading indicator values                              |
| S8  | Error shape                  | Trigger any `4xx` or `5xx`                                            | Response body matches `{"timestamp","status","error","message","path"}`                         |
| S9  | Macro snapshot degradation   | Remove `FRED_API_KEY`; `GET /api/v1/macro/snapshot`                   | Backend returns `503` when all macro fields are unavailable; data-service returns nullable macro fields, no fabricated values |
| S10 | Market calendar degradation  | Remove `FMP_API_KEY`; `GET /api/v1/calendar/earnings` and `/calendar/economic-events` | `200 OK` with `[]`; no fabricated earnings dates, EPS, revenue, or economic events |

---

## 8. Definition of done (agent checklist)

A task is complete only when every applicable item below is true:

- [ ] Code respects the relevant architecture boundary (hexagonal, port/adapter, no Spring in domain).
- [ ] Public API contracts are preserved, or all consumers (backend + frontend) are updated together in the same PR.
- [ ] Domain invariants and business rules remain enforced.
- [ ] Persistence changes include a Flyway migration and adapter/repository updates.
- [ ] Provider failures degrade gracefully; no fake data is introduced.
- [ ] Tests are added or updated near the changed behavior.
- [ ] All test commands pass for touched runtimes (`mvnw test`, `pytest`, `npm run lint`, `npm run build`).
- [ ] Smoke scenarios that cover the changed area have been verified.
- [ ] `docker compose config --quiet` passes if Compose was touched.
- [ ] SPEC.md or relevant docs under `docs/` are updated if endpoint behavior, provider behavior, config, or architecture changed.
- [ ] No secrets, `.env`, build outputs, or generated junk files are committed.
- [ ] Commit messages follow Conventional Commits format (section 5.2).
- [ ] PR description includes what changed, touched runtimes, verification steps, and test evidence.
- [ ] For a release PR targeting `main`: all 8 smoke scenarios pass and the PR is approved before merging.

---

## 9. Configuration and environment

Backend reads `.env` from the repo root at startup via `dotenv-java` in
`FinanceProjectApplication.java`. See SPEC.md section 12 for the full variable
table with required/optional status and defaults.

Key constraints:
- `DB_PASSWORD` is required for Compose and backend DB login.
- `FINNHUB_API_KEY` is required for full news, analyst, and sentiment coverage.
- `AZURE_OPENAI_*` variables are all required for agent analysis, chat, and LLM insight.
- Never log or expose these values.

---

## 10. Forbidden actions

The following are hard stops. Do not do them under any circumstances:

- Add fake or placeholder market data anywhere in the codebase.
- Store journal trade or watchlist state in memory (must persist through ports).
- Expose provider API keys to the frontend.
- Commit secrets, `.env`, or credentials.
- Push directly to `main` or `release/*`.
- Merge a release PR to `main` when any test or smoke scenario fails.
- Skip writing tests for new domain logic, controllers, or service methods.
- Change an existing endpoint path or DTO field name without updating all consumers.
- Add `@Service`/`@Component`/`@Repository` to domain classes.
- Modify already-applied Flyway migration files (create a new migration instead).