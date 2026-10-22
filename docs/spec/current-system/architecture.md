# Current-System Architecture

**Status:** Verified brownfield baseline

**Last verified:** 2026-10-01

This document owns runtime boundaries, component ownership, and cross-service
flows. It describes the implemented system, not the target roadmap.

## Runtime Boundaries

| Runtime | Responsibility | Must not own |
|---|---|---|
| `frontend/` | Browser routing, interaction state, visual composition, and calls to the Spring API | Provider credentials, direct normal-flow calls to the data-service, or server-side financial rules |
| `backend/` | Public `/api/v1` orchestration, domain rules, relational persistence, Redis caching, and provider/data-service adapters | Framework dependencies inside the domain or fabricated fallback data |
| `data-service/` | Provider resolution, quantitative analytics, research calculations, portfolio analytics, and optional Azure OpenAI reasoning | Product persistence or hidden data fetching inside AI agents |

```mermaid
flowchart LR
    FE[React frontend :5173] -->|HTTP /api/v1| BE[Spring backend :8080]
    BE --> PG[(PostgreSQL :5433)]
    BE --> RD[(Redis :6379)]
    BE -->|DATA_SERVICE_URL| DS[FastAPI data-service :8000]
    BE --> YH[Yahoo Finance adapters]
    BE --> TI[Tiingo adapters]
    BE --> FH[Finnhub adapters]
    DS --> PR[Provider resolver]
    PR --> YF[yfinance / Yahoo]
    DS -.->|.info / statements, ADR-0006 exception| YF
    PR --> T2[Tiingo]
    PR --> F2[Finnhub]
    DS --> FRED[FRED]
    DS --> FMP[FMP]
    DS --> AOAI[Azure OpenAI]
```

The frontend Axios client defaults to `http://localhost:8080/api/v1`. The Vite proxy
also targets the Spring backend. These are one compatibility boundary and must
change together when API routing changes.

## Backend Hexagonal Boundary

- Framework-free models, ports, and services live under
  `backend/src/main/java/com/ozkaslibasar/financeproject/domain/`.
- Outbound contracts live under `domain/port/outbound`; domain services reach
  persistence, caches, market providers, and the data-service through those
  contracts.
- Spring REST, persistence, client, cache, and scheduler implementations live
  under `adapter/`. Spring configuration lives under `config/`.
- `DomainConfig.java` registers pure domain services as beans. Domain classes do
  not carry Spring, JPA, or Lombok annotations; `ArchitectureTest` enforces these
  dependency restrictions.
- REST controllers translate HTTP and delegate. Scheduled adapters delegate one
  operation; `PriceIngestionJob` currently calls `PriceIngestionService.ingestAll()`.
- MapStruct mappers under adapter packages translate between domain and transport
  or persistence representations where a mapper exists.

## Data-Service Boundary

- `main.py` owns FastAPI application startup, middleware, router registration,
  the provider-chain price endpoint, and Prometheus exposition.
- `app/routers/` owns HTTP translation; `app/services/` owns analytics and
  orchestration; `app/providers/` owns provider-specific access and fallback;
  `app/models/` owns Pydantic request and response contracts.
- Analytics endpoints are read-only. A persistence responsibility requires a
  separately approved architecture change.
- Price history for every route and analytics service is read through
  `MarketDataResolver.get_ohlcv` with an explicit `adjusted` flag (ADR-0006).
  Company `.info` and financial-statement reads in the fundamental, factor, and
  valuation services are recorded direct-yfinance exceptions; do not add new
  direct provider calls. Agent functions receive prepared metrics and narrative
  context only; they do not call providers or tools and do not recalculate
  financial metrics.

## Frontend Boundary

- `frontend/src/main.tsx` mounts `BrowserRouter`; `frontend/src/App.tsx` owns
  application routes, redirects, and the routed shell composition.
- Current data fetching is mixed: reusable hooks own many loading/error flows,
  while `App.tsx` and some large components also call the API directly. This is
  current brownfield behavior, not a claim that the hook migration is complete.
- Transient interaction state such as selected symbols, modals, chart ranges,
  filters, sorting, and drawers remains browser/component state.
- Browser routes and backend endpoints are separate contracts. Adding or changing
  a browser route does not implicitly rename an `/api/v1` endpoint.
- Styling uses the CSS variables defined in `frontend/src/index.css`.
- The five primary Turkish navigation tasks are Bugün (`/dashboard`), Araştır
  (`/workspace`), İzleme Listem (`/watchlist`), Portföy (`/portfolio`), and
  Günlük (`/journal`). Existing deep links remain routable. Route views and
  larger dialogs load on demand through React `lazy` and `Suspense`.
- `/workspace/:symbol` selects the requested symbol when priced history is
  available. A missing symbol or history produces an explicit empty state.
- Araştır composes six tabs in a fixed order: Genel bakış, Grafik,
  Finansallar, Risk, Haberler, AI raporu (`components/research/`). Source
  details open as a nonmodal side panel only at viewport ≥1440px with the data
  area still ≥900px; otherwise as a modal drawer that returns focus.
- Bugün (`DashboardHome`) has a single `h1` and opens with the portfolio
  summary in the order Güncel değer, Maliyet, Fiyat kapsamı, Toplam kâr /
  zarar. When any holding lacks a price, the current total stays `—` and the
  priced subtotal is labelled "Fiyatı bulunan pozisyonların ara toplamı".
- The news page lists only the sources that delivered headlines in the current
  feed; no publisher is shown as a source unless it appears in the feed.
- UI copy is Turkish and uses one state vocabulary: "Yüklenemedi" (request
  failed), "Veri yok" (empty), "Kısmi veri" (partial coverage), "Yetersiz
  geçmiş" (insufficient history). Unknown financial values render as `—`, never
  as `0`. Dialogs (`ManageAssetsDrawer`, `TradingJournalModal`,
  `SettingsModal`, `StockDetailModal`) are named `role="dialog"` elements that
  close with Escape; validation and save results appear inside the dialog
  rather than through browser `alert`/`confirm`/`prompt`. Known gap: dates use
  en-US month names.
- `frontend/src/utils/portfolioValuation.ts` keeps a portfolio total unknown
  when any holding lacks a valid current price. Priced subtotal and coverage
  remain visible as partial evidence; acquisition cost is never substituted
  for a current price.

Frontend API access goes through domain modules under `frontend/src/api`
(`assets`, `journal`, `market`, `news`, `portfolio`, `research`, `watchlists`).
`client.ts` is an export-only compatibility barrel, and `http.ts` owns the shared
Axios instance (`apiClient`); `npm run check:api-boundaries` keeps the barrel
export-only and keeps Axios imports out of the domain modules. The base URL comes
from `frontend/src/api/config.ts`: `VITE_API_BASE_URL` when set, otherwise
`http://localhost:8080/api/v1`. A response interceptor converts HTTP and transport
failures into `ApiError` (`frontend/src/api/errors.ts`), whose `message` is the
Spring error body's `message` when present; request cancellations are passed
through unchanged. The `getApiError*` helpers read status, body, and message from
an `ApiError` or a raw HTTP failure.

### Frontend UI and TypeScript conventions

- The repository design decisions and `frontend/src/index.css` tokens guide UI
  implementation. Stitch may be used to explore or review a prototype, but its
  availability does not gate frontend work; generated screens are not production
  source. Compare proposed UI with the approved product foundation, scoped task,
  existing routes, and working frontend before implementation.
- The visual direction is institutional, calm, focused, professional, and highly
  readable. Keep dense financial detail available at the point of investigation
  while making the next user action and evidence quality clear.
- Reuse `frontend/src/index.css` tokens and existing components. Do not introduce
  a competing palette, spacing system, duplicate table/card/formatter, or loading
  pattern without an explicit design reason.
- Keep layouts responsive, validate text overflow at narrow and wide viewports,
  maintain accessible contrast and keyboard-visible focus, and use semantic
  controls for buttons, forms, tabs, menus, and filters.
- Avoid `any`. Keep API responses, props, UI states, and chart inputs explicitly
  typed; use discriminated unions where state variants matter.
- Format locale-sensitive financial display values with `Intl.NumberFormat`
  rather than hand-built separators or currency strings.
- Prefer hooks/API modules for new fetching logic and typed presentational props.
  Existing direct calls in `App.tsx` and large components are brownfield facts,
  not a pattern to expand without a scoped refactor.

## Price Refresh Flow

```mermaid
sequenceDiagram
    participant UI as Frontend
    participant PC as PriceController
    participant PR as PriceRefreshService
    participant DB as PriceRepositoryPort
    participant FD as FinancialDataPort
    participant YA as Yahoo adapter
    participant DS as Data-service adapter

    UI->>PC: GET /api/v1/prices/{symbol}/history
    PC->>PR: getFreshHistory(symbol, interval, range)
    PR->>DB: read requested window
    alt local data needs refresh
        PR->>FD: fetchPriceHistory
        FD->>YA: Yahoo first
        alt Yahoo empty
            FD->>DS: data-service fallback
        end
        PR->>DB: persist matching non-empty rows
    end
    PR-->>PC: real local/merged rows or empty list
```

`PriceRefreshService`, not the controller, owns DB-first refresh behavior. It
normalizes symbols, rejects cross-symbol provider rows, persists only non-empty
matching results, and returns existing real rows when refresh fails.

## Asset Resolution Flow

`AssetController` delegates symbol resolution to `AssetResolutionService`:

1. Normalize the canonical symbol.
2. Read the best usable Yahoo symbol mapping when one exists.
3. Ask `PriceChartClientPort` for provider metadata.
4. Persist `VERIFIED` metadata when the provider succeeds.
5. Persist mapped `PARTIAL` metadata when only a mapping is usable.
6. Otherwise persist a minimal `STOCK` asset with `UNAVAILABLE` metadata status.

Unavailable metadata is explicit evidence, not permission to invent exchange,
currency, name, or provider values.

## Agent-Analysis Flow

```mermaid
sequenceDiagram
    participant UI as Frontend
    participant AC as AgentAnalysisController
    participant AF as AgentAnalysisFacade
    participant RC as Redis cache
    participant UC as AgentAnalysisUseCase
    participant DS as Data-service agent endpoint
    participant DB as Analysis history

    UI->>AC: GET /api/v1/agent-analysis/{ticker}
    AC->>AF: getAnalysis(ticker)
    AF->>RC: get normalized ticker
    alt cache hit
        RC-->>AF: cached AgentAnalysisResult
    else cache miss
        AF->>UC: analyze(ticker)
        UC->>UC: build deterministic metric snapshot
        UC->>DS: metrics-only request
        alt successful analysis
            DS-->>UC: decision and summaries
            AF->>RC: cache result
            AF->>DB: persist history JSON
        else dependency unavailable
            DS-->>UC: empty result
        end
    end
```

Cache lookup belongs to `AgentAnalysisFacade`, while deterministic metric assembly
belongs to `AgentAnalysisUseCase`. The data-service pipeline is strictly:

1. Fundamental Analyst
2. Technical Analyst
3. Risk Analyst
4. Bull Researcher
5. Bear Researcher
6. Portfolio Manager

Azure OpenAI failure produces no synthetic narrative. The backend exposes an
unavailable result rather than manufacturing a decision.

## Accepted Architecture Decisions

- `docs/adr/0001-hexagonal-architecture.md`
- `docs/adr/0002-three-runtime-monorepo.md`
- `docs/adr/0003-redis-agent-analysis-cache.md`
- `docs/adr/0004-sequential-agent-order.md`
- `docs/adr/0005-db-first-lazy-price-loading.md`

## Evidence Anchors

- `backend/src/test/java/com/ozkaslibasar/financeproject/ArchitectureTest.java`
- `backend/src/main/java/com/ozkaslibasar/financeproject/config/DomainConfig.java`
- `backend/src/main/java/com/ozkaslibasar/financeproject/domain/service/PriceRefreshService.java`
- `backend/src/main/java/com/ozkaslibasar/financeproject/domain/service/AssetResolutionService.java`
- `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/AgentAnalysisFacade.java`
- `data-service/app/trading_agents/metrics_trading_graph.py`
- `frontend/src/App.tsx`
