# Verification and Delivery Contract

This document is the canonical source for repository verification, test-only
work, smoke scenarios, bug reporting, and release evidence. `AGENTS.md` owns
the obligation to use it; this document owns the details.

## Verification Principles

- Run checks for every runtime touched by a change.
- Read the complete command result before claiming success. A previous run,
  partial suite, or expected outcome is not evidence.
- Write or update tests close to changed behavior and follow existing fixture
  patterns.
- Provider degradation must be tested without inventing upstream responses.
- Automated tests must not call Yahoo Finance/yfinance, Tiingo, Finnhub, FMP,
  FRED, Azure OpenAI, or another live external provider.
- Use stubs, fakes, or wire-level mocks only at I/O boundaries such as external
  APIs, databases, filesystems, clocks, and randomness. Do not mock the logic
  under test, and state a one-line reason for each mocked dependency.

## Runtime Commands

Run commands from the directory shown unless the command is repository-rooted.

| Scope | Directory | Required local checks |
|---|---|---|
| Backend | `backend/` | Windows: `.\mvnw.cmd test`; Unix/macOS: `./mvnw test` |
| Data-service | `data-service/` | `python -m pytest` |
| Frontend | `frontend/` | `npm run lint`, `npm run test:coverage`, `npm run build` |
| Frontend E2E | `frontend/` | `npm run e2e` when routes, critical user flows, or release readiness are affected |
| Frontend integrated E2E | `frontend/` | `npm run e2e:integrated` with PostgreSQL, Redis and the backend running (`docker compose up -d postgres redis`, then backend `spring-boot:run`); required when frontend↔backend contracts, persistence flows or error handling change. Its global setup truncates and seeds the local database. Prerequisites: repo-root `.env` with `DB_PASSWORD` for compose; a `backend/.env` file (may be empty) because the backend's `main()` loads it. CI sinkholes the provider hosts (finnhub.io, api.tiingo.com, Yahoo query1/query2) in `/etc/hosts` so no live provider is called; locally, do not set provider keys and expect degraded provider sections. |
| Infrastructure | repository root | `docker compose config --quiet` when Compose or service configuration changes |

CI also runs backend tests, data-service tests, frontend lint/coverage/build/E2E,
frontend integrated E2E against a real backend, and Compose validation. `.github/workflows/ci.yml` currently selects Python 3.12,
while `.github/workflows/data-service.yml` selects Python 3.11. Treat this as an
explicit compatibility gap; do not document one version as the sole project
contract until CI is reconciled.

## Tests Required by Change Type

| Change | Minimum evidence |
|---|---|
| New domain/use-case/service behavior | Happy path and at least one error or boundary case |
| New backend endpoint | `@WebMvcTest` for success, relevant 4xx behavior, and provider-failure degradation |
| New data-service route | Pytest coverage for valid input and at least one invalid or boundary input |
| Provider or resolver-chain change | Success, empty response, provider failure, and fallback-order coverage; verify health tracking and resolver priority registration |
| Persistence/schema change | New Flyway migration plus repository/adapter coverage of the new column or constraint |
| DataFrame production/transformation | Pytest assertions using `pandas.testing.assert_frame_equal` where applicable |
| Frontend behavior | Focused component/hook test plus lint, coverage, and build; E2E for routed critical flows |
| Backend response DTO or frontend API type used by both runtimes | Update the matching file in `docs/contracts/fixtures/`, the backend `ContractFixtures.assertSameShape` test, and the frontend `src/api/contract.test.ts` schema in the same change |

Backend tests use JUnit 5 and Mockito while keeping domain objects framework-free.
Data-service tests use pytest and should be parametrized for numerical and boundary
conditions. Frontend tests follow the existing Vitest and Testing Library setup.
Docker is required for full backend integration evidence. The current
Testcontainers suites use `disabledWithoutDocker=true`, so an unavailable Docker
daemon can skip those classes instead of failing the Maven run; report those skips
and do not claim complete integration coverage from that run.

For financial calculations, cover zero, negative, very large, and precision or
rounding boundaries whenever the input domain permits them. Expected results must
come from an independently worked formula or written requirement, and assertions
must preserve the documented scale and rounding mode.

## Test-Only Task Rules

When the explicit task is only to write, extend, or generate tests:

- Do not modify production source code.
- Limit edits to the relevant test directories, plus the permitted
  `test-results/` evidence output:
  - Backend: `backend/src/test/java/...`
  - Data-service: `data-service/tests/...`
  - Frontend: existing or new `*.test.*`/`*.spec.*` files under `frontend/src/`
- Derive expected values independently from a hand-calculated financial formula,
  written requirement, or logical deduction across independent scenarios.
- Do not read the implementation output and copy it back as the expected value.
- If mirroring the implementation is unavoidable, mark the test or docstring with
  `EXPECTED_SOURCE: mirrors_implementation (RISKY)`.
- A genuine production defect discovered by a correct test remains visible: do
  not loosen assertions, swallow the exception, delete the test, or silently skip
  it. Record the failure and do not fix production code unless the user expands
  the task.
- If the test itself is incorrect, repair the test and explain the independent
  source for the corrected expectation.
- If intended behavior cannot be established safely, use `xfail` or `skip` with
  a reason and add it to an `AMBIGUOUS_BEHAVIOR` list for human resolution.
- Work module by module; finish and record one slice before starting the next.
- When the user asks only for a prompt, return the prompt and do not create or
  modify test files.

## Bug Reporting for Test Work

After running test-only work, record every genuine red test as one JSON object per
line in `test-results/bugs-found-{module}.jsonl`:

```json
{"test_name":"...","source_file":"...","source_line":1,"expected":"...","actual":"...","hypothesis":"...","severity":"medium"}
```

Required fields are `test_name`, `source_file`, `source_line`, `expected`,
`actual`, `hypothesis`, and `severity`. Severity is one of `critical`, `high`,
`medium`, or `low`.

## Smoke Test Preconditions

Start PostgreSQL, Redis, and the required application runtimes before integrated
smoke verification. Use real configured providers or intentionally remove a key
to test degradation; never insert fake market evidence to make a scenario pass.
For a missing-key scenario, change the environment before startup, restart the
runtime that reads the key, and evict or expire only the relevant cache entries so
a warm cache cannot mask the provider path.

A feature PR runs every scenario that exercises its changed area. A release PR
targeting `main` runs the complete S1-S10 catalog.

## Smoke Catalog

| ID | Scenario | Request or setup | Pass condition |
|---|---|---|---|
| S1 | Asset metadata degradation | `POST /api/v1/assets/batch` with `{"symbols":["AAPL"]}` | `200 OK`; persisted asset exposes real verified/partial metadata or explicit unavailable status; no invented metadata |
| S2 | DB-first price refresh | `GET /api/v1/prices/AAPL/history?interval=1d&range=1mo` | `200 OK`; local rows are used first; a provider-backed refresh is persisted when local data is absent/stale; if refresh fails, existing real rows may remain and their timestamp is the only freshness signal; OHLCV fields remain stable |
| S3 | News provider degradation | Remove `FINNHUB_API_KEY` before startup, restart the relevant runtime, evict only related news/provider cache entries, then `GET /api/v1/news/AAPL` | `200 OK` with an empty or partial response; no fake news, sentiment, or analyst values |
| S4 | Journal persistence | Create a trade, restart, then `GET /api/v1/journal/trades` | Trade survives restart with stable identity, symbol, quantity, status, and PnL fields |
| S5 | Watchlist persistence | Create a watchlist, add symbols, restart, then `GET /api/v1/watchlists` | Normalized ordered symbols survive restart through persistent storage |
| S6 | Agent-analysis cache | Clear the symbol cache, then call `GET /api/v1/agent-analysis/AAPL` twice inside the TTL | First successful response has `from_cache=false`; second is cached with decision/confidence preserved; unavailable AI yields explicit 503 rather than synthetic text |
| S7 | Insufficient candles | Supply fewer than 30 candles to technical analysis | `422 Unprocessable Entity`; no misleading indicator values |
| S8 | Backend error shape | Trigger a representative backend 4xx and 5xx | Body contains exactly the contract fields `timestamp`, `status`, `error`, `message`, and `path` |
| S9 | Macro degradation | Remove `FRED_API_KEY` before startup, restart relevant runtimes, evict the macro cache, then call `GET /api/v1/macro/snapshot` | Data-service fields remain nullable; backend returns 503 when every macro field is unavailable; no fabricated macro value |
| S10 | Market-calendar degradation | Remove `FMP_API_KEY` before startup, restart relevant runtimes, evict earnings/economic-event cache entries, then call both calendar endpoints | `200 OK` with empty lists; no fabricated dates, EPS, revenue, or economic events |

## Git and Pull Request Evidence

- Start feature and bugfix branches from `main` as `feat/<slug>` or
  `fix/<slug>`. Start documentation branches from `main` as `docs/<slug>` and
  tooling/dependency branches as `chore/<slug>`. A released hotfix starts from
  its `release/vX.Y` branch as `fix/<slug>`.
- Each commit is one self-consistent change that leaves applicable checks green.
- Use Conventional Commits:
  `<type>(<scope>): <imperative summary>` with a maximum 72-character summary
  and no trailing period.
- Allowed types: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `perf`.
  Common scopes: `backend`, `data-service`, `frontend`, `infra`, `db`, `agents`,
  and `spec`.
- Every branch reaches protected branches through a PR. The PR description names
  what changed and why, touched runtimes, local verification commands or smoke
  scenarios, and fresh test evidence.
- A release PR may merge only after all runtime suites and S1-S10 pass, breaking
  changes are documented, and the PR is reviewed and approved. Tag the merged
  main commit using the agreed `vX.Y.Z` release version.

## Definition of Done

- Architecture boundaries and public contracts remain intact or every affected
  consumer is migrated together.
- Domain invariants and financial rules remain enforced.
- Persistence changes include a new migration and adapter/repository updates;
  applied migrations are unchanged.
- Provider failures remain explicit and no fake evidence is introduced.
- Tests were added or updated near changed behavior.
- Every touched-runtime command passed with fresh evidence.
- Applicable smoke scenarios passed; a release PR passed S1-S10.
- Documentation was updated when architecture, endpoints, provider behavior,
  configuration, or verification contracts changed.
- The scoped diff contains no secrets, local environment files, build output,
  dependency directories, or unrelated user changes.
- Commit and PR metadata follow the policy above.

## Delivery Report

The final task report names files created or changed, commands actually run, exact
failure summaries, checks not run, and remaining risk or missing coverage. Keep
the report concise and distinguish fresh evidence from assumptions.
