---
id: FINANCE-PROJECT-CURRENT-SYSTEM
status: current
lastVerified: 2026-10-01
companions:
  - docs/spec/current-system/architecture.md
  - docs/spec/current-system/contracts.md
  - docs/spec/current-system/domain-and-data.md
  - docs/spec/current-system/operations.md
  - docs/agent/verification.md
---

> **Canonical current-system contract.** This file defines verified implemented
> behavior. The listed companions carry load-bearing detail and must be read when
> their task trigger applies. Target product behavior belongs in
> `docs/product/PRD.md`.

# Finance Project Current-System Contract

## Why

Finance Project provides a local, evidence-driven environment for tracking
assets and portfolios, researching securities, and supporting investment
decisions across price, fundamental, technical, risk, news, macro, calendar, and
AI-assisted analysis. Its current contract must keep real quantitative evidence
authoritative, surface missing provider evidence explicitly, and preserve
portfolio history while the brownfield product evolves toward the approved PRD.

## Capabilities

- **CAP-1 — Market evidence**
  - **intent:** A user can track assets and obtain real provider-backed market evidence.
  - **success:** Asset metadata and OHLCV data are returned from persistence/providers or expose their documented empty, partial, unavailable, or timestamp-only fallback behavior; no synthetic value appears.

- **CAP-2 — Portfolio history**
  - **intent:** A user can maintain ledger-derived portfolios, positions, and investment history.
  - **success:** Transactions persist, holdings derive deterministically, and invalid transitions such as overselling fail explicitly.

- **CAP-3 — Security research**
  - **intent:** A user can research supported stocks and funds using technical, fundamental, valuation, risk, factor, news, macro, and calendar evidence.
  - **success:** Research responses preserve nullable provider-derived metrics and insufficient-history indicators; consumers do not treat absent PEG, long-lookback values, or an all-null valuation metric set as affirmative valuation evidence.

- **CAP-4 — Journal and watchlists**
  - **intent:** A user can maintain persistent trading-journal and watchlist workflows.
  - **success:** Journal entries and ordered normalized watchlist symbols survive restart, while aggregated research preserves successful sections during partial provider failure.

- **CAP-5 — Decision support**
  - **intent:** The system can produce deterministic and AI-assisted decision-support outputs from prepared evidence.
  - **success:** Quantitative metrics remain authoritative; agents execute in the documented sequence, and AI failure returns no synthetic decision or narrative.

- **CAP-6 — Safe degradation**
  - **intent:** The system can remain truthful when a provider, cache, or runtime dependency is unavailable.
  - **success:** Stable contracts return their documented empty, nullable, partial, insufficient-data, unavailable, or timestamp-only fallback outcome without fabricating market evidence. Price freshness is inferred from timestamps because price DTOs have no stale flag.

- **CAP-7 — Reproducible operation**
  - **intent:** Maintainers can operate and verify the three-runtime system with repeatable evidence.
  - **success:** Touched-runtime checks and applicable smoke scenarios produce fresh, reviewable results under `docs/agent/verification.md`.

## Constraints

- The backend domain remains framework-free and reaches infrastructure through
  ports/adapters registered from Spring configuration.
- Existing public endpoint paths and DTO fields remain compatible unless every
  consumer migrates in the same change.
- Normal frontend flows use the Spring API; the backend owns product orchestration
  and may call the FastAPI data-service.
- Data-service analytics remain read-only unless an explicit persistence design
  is approved.
- Technical analysis rejects fewer than 30 candles. Metrics requiring longer
  history remain nullable rather than fabricated.
- Price history uses local persistence first, provider refresh when needed, and
  persistence of valid matching fetched rows.
- AI agents receive prepared metrics, run sequentially, and do not fetch hidden
  market data or replace deterministic evidence.
- Provider, cache, legal/data-rights, and missing-evidence limits remain visible
  to consumers.
- Applied Flyway migrations are immutable; Flyway owns schema evolution and JPA
  only validates it (`ddl-auto=validate`), so schema changes receive new migrations.
- Secrets and provider credentials remain server-side and out of source control.

## Non-goals

- Production multi-user authentication, authorization, and tenant isolation.
- Brokerage integration, order routing, trade execution, or account write-back.
- Guaranteed real-time provider latency, completeness, or uptime.
- Personalized financial-advice guarantees or autonomous investment execution.
- Treating AI narratives as authoritative over quantitative evidence.
- Defining target roadmap behavior in this current-system contract.

## Success Signal

A maintainer can follow `AGENTS.md` to one applicable companion, trace every
documented contract to current code/configuration, run the required verification,
and demonstrate that provider or AI failure never manufactures investment
evidence or corrupts persistent portfolio history.

## Assumptions

- Current portfolio ownership defaults to the local `default` user convention;
  this is not tenant isolation.
- External provider schemas, quotas, and availability can change independently of
  this repository, so provider-backed fields remain conditional evidence.
- `docs/openapi.yaml` is supporting/generated documentation; controller and router
  definitions remain the executable route authority.

## Open Questions

- Will MongoDB receive an approved durable product responsibility, or should its
  configured Compose/application footprint be removed in a separate change?
- Should an all-null valuation metric set return an unavailable grade instead of
  the current `FAIR` default?
- When will a follow-up to ADR-0006 extend `IMarketDataProvider` so the
  fundamental, factor, and valuation `.info`/statement reads leave direct
  yfinance, and should unreachable `portfolio_analytics_service.py` be removed?

## Companion Contracts

| Task trigger | Mandatory companion |
|---|---|
| Architecture, runtime ownership, or cross-service flow | `docs/spec/current-system/architecture.md` |
| Endpoint, browser route, DTO, response, or error behavior | `docs/spec/current-system/contracts.md` |
| Domain invariant, financial calculation, persistence, or migration | `docs/spec/current-system/domain-and-data.md` |
| Provider, cache, configuration, security, degradation, logging, or observability | `docs/spec/current-system/operations.md` |
| Test, smoke scenario, bug report, CI, PR, or release evidence | `docs/agent/verification.md` |

Product targets, innovation claims, delivery phases, and post-V1 scope are owned
by `docs/product/PRD.md` and its delivery artifacts, not by this current-system
contract.
