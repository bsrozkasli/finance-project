# Data-Service Boundary Hardening Plan 6 — Analysis and Research Failure Semantics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make research failures explicit (422 insufficient data, 503 missing dependency, 500 with a non-leaking message), and fix two defects that silently empty analysis sections: `/full` never computes its technical section, and `/patterns?include_llm_context=true` never returns LLM context.

**Architecture:** A tiny `app/errors.py` defines `InsufficientDataError(ValueError)` and `DependencyUnavailableError(RuntimeError)`. Services raise them where they already detect those conditions; `app/routers/research.py` translates them in one helper. In `app/routers/analysis.py`, `/full` stops passing FastAPI `Query` objects into the technical route and logs every swallowed section, and `/patterns` awaits the LLM call instead of nesting an event loop. No response model changes.

**Tech Stack:** FastAPI `HTTPException`, Python logging, pytest `caplog`/`monkeypatch`, `ScriptedProvider`.

**Plan Set:** Plan 6 of 6 in `docs/superpowers/plans/2026-10-13-data-service-boundary-hardening.md`.

**Depends On:** Plan 5 (resolver-backed `_load_history`, `get_resolver` patch points, `serve_bars` test fixture pattern).

**Produces:** `app.errors.InsufficientDataError`, `app.errors.DependencyUnavailableError`; `research._raise_research_error(section: str, symbol: str, exc: Exception) -> NoReturn`; updated `contracts.md` research rows.

**Spec:** `docs/product/evidence/data-service.md` `CAP-CUR-DS-005` ("service exceptions in research routes are surfaced as 500"; "`full` … swallows technical/sentiment/LLM exceptions into nullable sections"); `DOC-CONFLICT-008`; `docs/spec/current-system/contracts.md` status meanings (422 analytics rule, 503 dependency unavailable).

## Locked Decisions

- Status mapping for every `/api/v1/research/*` route: `InsufficientDataError` → 422 with the error text; `DependencyUnavailableError` → 503 with the error text; anything else → 500 with detail `"<section> research failed"` and a server log line `event=research_failed section=<section> symbol=<symbol> error_type=<ExceptionClass>`. Raw exception text is never returned for 500 because provider client errors can contain request URLs and tokens.
- `RiskAnalyticsService` raises `InsufficientDataError` for fewer than 30 rows (message also fixes the mojibake `â‰¥` to `>=`). `EarningsAnalysisService` raises `DependencyUnavailableError("FINNHUB_API_KEY is not configured")`. Both subclasses keep every existing `except ValueError`/`except Exception` caller working; `CompositeScoreService` and `LlmInsightService` catch `Exception` and are unaffected.
- Backend compatibility (verified read-only): `DataServiceResearchAdapter` and `YahooStatementClientAdapter` catch every exception from these routes and return empty results, so 500→422/503 changes nothing in Spring. `LlmInsightAdapter.getFullAnalysis` already maps a non-null `technical` map.
- `/full` calls `get_technical_analysis(symbol, interval="1d", range="3mo")` — the values the route's `Query` defaults declare. Response nullability stays; each swallowed section logs `event=full_analysis_section_unavailable section=<technical|sentiment|llm_insight> symbol=<symbol> error_type=<ExceptionClass>`.
- `/patterns` awaits `LlmInsightService.generate_insight(...)` directly. LLM failure still yields `llm_context = null` with 200.
- Per-section status DTOs (seven-state contract) stay out of scope, blocked on `OQ-3`.

## Global Constraints

- "Represent provider failure explicitly as unavailable, insufficient, empty, partial, or stale data; never replace missing evidence with synthetic values." (`AGENTS.md`)
- "Preserve endpoint paths and DTO fields unless every consumer changes together." (`AGENTS.md`)
- "FastAPI normally uses its `{"detail": ...}` HTTP error shape; the five-field shape … must not be falsely applied to internal data-service routes." (`contracts.md`)
- "Never log raw secrets, authorization headers, or provider credentials." (`operations.md`)
- Preserve unrelated working-tree changes.

## Review Focus

- **Secret leaks through 500 detail** — an exception message containing `token=secret-123` must not appear in the response body. Task 1 `test_unexpected_research_error_returns_generic_500`.
- **Insufficient history reported as server error** — 10 sessions of risk history must give 422, not 500. Task 1 `test_insufficient_risk_history_returns_422`.
- **Missing key reported as server error** — earnings without `FINNHUB_API_KEY` must give 503. Task 1 `test_missing_finnhub_key_returns_503_for_earnings`.
- **`/full` technical always null** — with history available, `technical` must be populated and the provider must receive `("AAPL", "1d", "3mo")`. Task 3 `test_full_analysis_computes_technical_section`.
- **LLM context silently dropped** — `include_llm_context=true` with a working LLM must return its text. Task 2 `test_patterns_include_llm_context_returns_insight_text`.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `data-service/app/errors.py` | Create | Typed analytics failures |
| `data-service/app/routers/research.py` | Modify | One error-translation helper for all research routes |
| `data-service/app/services/risk_analytics_service.py:66-77` | Modify | Raise `InsufficientDataError` |
| `data-service/app/services/earnings_analysis_service.py:42-43` | Modify | Raise `DependencyUnavailableError` |
| `data-service/tests/test_research_endpoints.py` | Create | Research status mapping |
| `data-service/app/routers/analysis.py` (`get_full_analysis`, `get_patterns`) | Modify | Explicit technical args, section logging, awaited LLM call |
| `data-service/tests/test_analysis_failure_paths.py` | Create | `/full` and `/patterns` failure paths |
| `docs/spec/current-system/contracts.md` | Modify | Research and full-analysis rows |

---

## Task 1: Explicit Research Failure Statuses

**Files:**
- Create: `data-service/app/errors.py`
- Modify: `data-service/app/routers/research.py`
- Modify: `data-service/app/services/risk_analytics_service.py:66-77`
- Modify: `data-service/app/services/earnings_analysis_service.py:38-43`
- Test: `data-service/tests/test_research_endpoints.py`

**Interfaces:**
- Consumes: `risk_analytics_service.get_resolver` patch point (Plan 5); `settings.FINNHUB_API_KEY`.
- Produces: `InsufficientDataError(ValueError)`, `DependencyUnavailableError(RuntimeError)`; `_raise_research_error(section, symbol, exc) -> NoReturn`.
- Preserves: research paths, response models, and success behavior.

**Acceptance Evidence:**
- `pytest tests/test_research_endpoints.py -v`: 3 passed.

- [ ] **Step 1: Write the failing tests**

```python
"""Research routes translate typed failures into explicit statuses."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.providers.market_data_resolver import MarketDataResolver
from app.services import risk_analytics_service
from app.services.fundamental_analysis_service import FundamentalAnalysisService
from main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_insufficient_risk_history_returns_422(monkeypatch, scripted_provider, bars, client):
    provider = scripted_provider("fx-research-risk", ohlcv=bars([100.0 + index for index in range(10)]))
    monkeypatch.setattr(risk_analytics_service, "get_resolver", lambda: MarketDataResolver([provider]))

    response = client.get("/api/v1/research/risk/AAPL")

    assert response.status_code == 422
    assert "Insufficient price data" in response.json()["detail"]


def test_missing_finnhub_key_returns_503_for_earnings(monkeypatch, client):
    monkeypatch.setattr(settings, "FINNHUB_API_KEY", "")

    response = client.get("/api/v1/research/earnings/AAPL")

    assert response.status_code == 503
    assert response.json()["detail"] == "FINNHUB_API_KEY is not configured"


def test_unexpected_research_error_returns_generic_500(monkeypatch, client):
    def _boom(cls, symbol):
        raise RuntimeError("token=secret-123 upstream failed")

    monkeypatch.setattr(FundamentalAnalysisService, "analyze", classmethod(_boom))

    response = client.get("/api/v1/research/fundamental/AAPL")

    assert response.status_code == 500
    assert response.json()["detail"] == "fundamental research failed"
    assert "secret-123" not in response.text
```

- [ ] **Step 2: Run them and confirm failure**

Run (from `data-service/`): `.\.venv\Scripts\python.exe -m pytest tests/test_research_endpoints.py -v`

Expected: 3 FAIL — risk and earnings return 500; fundamental's 500 detail echoes the secret.

- [ ] **Step 3: Create `app/errors.py`**

```python
"""Typed analytics failures that routers translate into explicit HTTP statuses."""


class InsufficientDataError(ValueError):
    """The request is valid, but the available evidence is too short or sparse to calculate."""


class DependencyUnavailableError(RuntimeError):
    """A required provider credential or service is unavailable and no fallback exists."""
```

- [ ] **Step 4: Raise the typed errors in the services**

`risk_analytics_service.py` — add `from app.errors import InsufficientDataError` and replace both insufficient-data `raise ValueError(...)` blocks with:

```python
        if asset_df.empty or len(asset_df) < 30:
            raise InsufficientDataError(
                f"Insufficient price data for '{symbol}': got {len(asset_df)} rows, need >= 30."
            )
        if market_df.empty or len(market_df) < 30:
            raise InsufficientDataError(
                f"Insufficient market data for '{_MARKET_BENCHMARK}': got {len(market_df)} rows, need >= 30."
            )
```

`earnings_analysis_service.py` — add `from app.errors import DependencyUnavailableError`; replace `raise ValueError("FINNHUB_API_KEY is not configured")` with `raise DependencyUnavailableError("FINNHUB_API_KEY is not configured")`; in the docstring change `ValueError: If the Finnhub API key is not configured.` to `DependencyUnavailableError: If the Finnhub API key is not configured.`

- [ ] **Step 5: Replace error handling in `app/routers/research.py`**

Add after the existing imports:

```python
import logging
from typing import NoReturn

from app.errors import DependencyUnavailableError, InsufficientDataError

logger = logging.getLogger(__name__)


def _raise_research_error(section: str, symbol: str, exc: Exception) -> NoReturn:
    if isinstance(exc, InsufficientDataError):
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if isinstance(exc, DependencyUnavailableError):
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    logger.error(
        "event=research_failed section=%s symbol=%s error_type=%s",
        section, symbol, type(exc).__name__,
    )
    raise HTTPException(status_code=500, detail=f"{section} research failed") from exc
```

In each of the seven routes replace

```python
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

with `except Exception as exc:` followed by `_raise_research_error("<section>", symbol, exc)`, using sections `fundamental`, `valuation`, `risk`, `earnings`, `factor`, `institutional`, `composite` in route order.

- [ ] **Step 6: Run focused and full checks**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_research_endpoints.py tests/test_risk_analytics_service.py -v` — Expected: all passed (Plan 5's `pytest.raises(ValueError, …)` still matches the subclass).

Run: `.\.venv\Scripts\python.exe -m pytest -q` — Expected: green, 1 xfailed.

- [ ] **Step 7: Commit**

```powershell
git add data-service/app/errors.py data-service/app/routers/research.py data-service/app/services/risk_analytics_service.py data-service/app/services/earnings_analysis_service.py data-service/tests/test_research_endpoints.py
git diff --cached --check
git commit -m "fix(data-service): map research failures to explicit statuses"
```

---

## Task 2: Await LLM Context in `/patterns`

**Files:**
- Modify: `data-service/app/routers/analysis.py` (`get_patterns`, the `include_llm_context` block)
- Test: `data-service/tests/test_analysis_failure_paths.py` (create; Task 3 extends it)

**Interfaces:**
- Consumes: `analysis.get_resolver` patch point; `LlmInsightService.generate_insight(request) -> LlmInsightResponse` (only `.insight` is read).
- Produces: `/patterns?include_llm_context=true` returns `llm_context` from the LLM.
- Preserves: `PatternDetectionResponse`; `llm_context = null` when the key is missing or the LLM fails.

**Acceptance Evidence:**
- `pytest tests/test_analysis_failure_paths.py -v`: 2 passed.

- [ ] **Step 1: Write the failing test file**

```python
"""Failure and degradation paths of the analysis router."""

from __future__ import annotations

import logging
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.providers.market_data_resolver import MarketDataResolver
from app.routers import analysis
from app.services.llm_insight_service import LlmInsightService
from main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def history(monkeypatch, scripted_provider, bars):
    def _install(closes: list[float]):
        provider = scripted_provider("fx-analysis-failure", ohlcv=bars(closes))
        monkeypatch.setattr(analysis, "get_resolver", lambda: MarketDataResolver([provider]))
        return provider

    return _install


def test_patterns_include_llm_context_returns_insight_text(monkeypatch, history, client):
    history([100.0 + index for index in range(100)])
    monkeypatch.setattr(settings, "AZURE_OPENAI_API_KEY", "test-azure-key")

    async def fake_generate_insight(request):
        return SimpleNamespace(insight="Context sentence.")

    monkeypatch.setattr(LlmInsightService, "generate_insight", fake_generate_insight)

    response = client.get("/api/v1/patterns/AAPL?include_llm_context=true")

    assert response.status_code == 200
    assert response.json()["llm_context"] == "Context sentence."


def test_patterns_llm_failure_keeps_null_context(monkeypatch, history, client):
    history([100.0 + index for index in range(100)])
    monkeypatch.setattr(settings, "AZURE_OPENAI_API_KEY", "test-azure-key")

    async def failing_generate_insight(request):
        raise RuntimeError("llm outage")

    monkeypatch.setattr(LlmInsightService, "generate_insight", failing_generate_insight)

    response = client.get("/api/v1/patterns/AAPL?include_llm_context=true")

    assert response.status_code == 200
    assert response.json()["llm_context"] is None
```

- [ ] **Step 2: Run it and confirm failure**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_analysis_failure_paths.py -v`

Expected: `test_patterns_include_llm_context_returns_insight_text` FAILS (`llm_context` is `None`: `run_until_complete` raises "Cannot run the event loop while another loop is running", which the route swallows); the failure-path test passes.

- [ ] **Step 3: Replace the LLM block in `get_patterns`**

```python
    llm_context = None
    if include_llm_context and settings.AZURE_OPENAI_API_KEY:
        try:
            from app.services.llm_insight_service import LlmInsightService

            insight_request = LlmInsightRequest(
                symbol=symbol,
                include_technical=False,
                include_sentiment=False,
                scenario="Provide a brief 2-sentence market context for pattern analysis.",
            )
            result = await LlmInsightService.generate_insight(insight_request)
            llm_context = result.insight if result else None
        except Exception as exc:
            logger.warning(
                "event=pattern_llm_context_unavailable symbol=%s error_type=%s", symbol, type(exc).__name__
            )
```

Add `import logging` to the imports and `logger = logging.getLogger(__name__)` below `router = APIRouter(...)`.

- [ ] **Step 4: Run focused and full checks**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_analysis_failure_paths.py tests/test_analysis_endpoints.py -v` — Expected: all passed.

Run: `.\.venv\Scripts\python.exe -m pytest -q` — Expected: green, 1 xfailed.

- [ ] **Step 5: Commit**

```powershell
git add data-service/app/routers/analysis.py data-service/tests/test_analysis_failure_paths.py
git diff --cached --check
git commit -m "fix(data-service): await LLM context in pattern detection"
```

---

## Task 3: `/full` Technical Section and Section Logging

**Files:**
- Modify: `data-service/app/routers/analysis.py` (`get_full_analysis`)
- Modify: `data-service/tests/test_analysis_failure_paths.py` (append two tests)

**Interfaces:**
- Consumes: `history` fixture (Task 2); `logger` in `app.routers.analysis` (Task 2).
- Produces: `/full/{symbol}` with a populated `technical` section when history exists; one `full_analysis_section_unavailable` log line per swallowed section.
- Preserves: `FullAnalysisResponse` fields and nullability; 200 when sections fail.

**Acceptance Evidence:**
- `pytest tests/test_analysis_failure_paths.py -v`: 4 passed.

- [ ] **Step 1: Append the failing tests**

```python
def test_full_analysis_computes_technical_section(monkeypatch, history, client):
    provider = history([100.0 + index for index in range(100)])
    monkeypatch.setattr(settings, "FINNHUB_API_KEY", "")
    monkeypatch.setattr(settings, "AZURE_OPENAI_API_KEY", "")

    response = client.get("/api/v1/full/AAPL")

    assert response.status_code == 200
    assert response.json()["technical"]["symbol"] == "AAPL"
    assert provider.calls_for("ohlcv")[0][1] == ("AAPL", "1d", "3mo")


def test_full_analysis_logs_unavailable_technical_section(monkeypatch, history, client, caplog):
    history([])
    monkeypatch.setattr(settings, "FINNHUB_API_KEY", "")
    monkeypatch.setattr(settings, "AZURE_OPENAI_API_KEY", "")

    with caplog.at_level(logging.WARNING, logger="app.routers.analysis"):
        response = client.get("/api/v1/full/AAPL")

    assert response.status_code == 200
    assert response.json()["technical"] is None
    assert "event=full_analysis_section_unavailable section=technical symbol=AAPL" in caplog.text
```

- [ ] **Step 2: Run them and confirm failure**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_analysis_failure_paths.py -v`

Expected: both new tests FAIL — the provider receives `Query` objects instead of `"1d"`/`"3mo"`, and nothing is logged.

- [ ] **Step 3: Replace the three section fetchers in `get_full_analysis`**

```python
        async def fetch_technical():
            try:
                return await get_technical_analysis(symbol, interval="1d", range="3mo")
            except Exception as exc:
                _log_unavailable_section("technical", symbol, exc)
                return None

        async def fetch_sentiment():
            try:
                if not settings.FINNHUB_API_KEY:
                    return None
                from app.services.sentiment_service import SentimentService
                return await SentimentService.analyze_sentiment(symbol)
            except Exception as exc:
                _log_unavailable_section("sentiment", symbol, exc)
                return None
```

Replace the LLM `except Exception: pass` with:

```python
            except Exception as exc:
                _log_unavailable_section("llm_insight", symbol, exc)
```

Add the helper above `get_full_analysis`:

```python
def _log_unavailable_section(section: str, symbol: str, exc: Exception) -> None:
    logger.warning(
        "event=full_analysis_section_unavailable section=%s symbol=%s error_type=%s",
        section, symbol, type(exc).__name__,
    )
```

- [ ] **Step 4: Run focused and full checks**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_analysis_failure_paths.py -v` — Expected: 4 passed.

Run: `.\.venv\Scripts\python.exe -m pytest -q` — Expected: green, 1 xfailed.

- [ ] **Step 5: Commit**

```powershell
git add data-service/app/routers/analysis.py data-service/tests/test_analysis_failure_paths.py
git diff --cached --check
git commit -m "fix(data-service): compute and log full-analysis sections"
```

---

## Task 4: Contract Documentation

**Files:**
- Modify: `docs/spec/current-system/contracts.md` (Data-Service API table: Research rows and `GET /api/v1/full/{symbol}` row)

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: documented research status semantics.
- Preserves: all other rows.

**Acceptance Evidence:**
- `rg -n "422 insufficient" docs/spec/current-system/contracts.md` prints the new note.

- [ ] **Step 1: Gate — confirm the note is absent**

Run (repo root): `rg -n "422 insufficient" docs/spec/current-system/contracts.md`

Expected: no output.

- [ ] **Step 2: Edit `contracts.md`**

Replace the `GET /api/v1/full/{symbol}` row purpose with `Partially degradable combined analysis; unavailable sections are null and logged as full_analysis_section_unavailable`. Directly below the Data-Service API table, before "FastAPI router prefixes and decorators are the route authority", add:

```markdown
Research routes (`/api/v1/research/*`) return 422 insufficient data (for example
fewer than 30 sessions of risk history), 503 when a required dependency is
unconfigured (for example `FINNHUB_API_KEY` for earnings), and 500 with the
generic detail `<section> research failed` for unexpected errors. Spring
research adapters treat every non-2xx response as empty evidence.
```

- [ ] **Step 3: Verify and commit**

Run: `rg -n "422 insufficient" docs/spec/current-system/contracts.md` — Expected: one match.

```powershell
git add docs/spec/current-system/contracts.md
git diff --cached --check
git commit -m "docs(spec): document data-service research failure statuses"
```

---

## Plan Exit Criteria

- [ ] Every task has its own focused verification evidence.
- [ ] `InsufficientDataError`, `DependencyUnavailableError`, and `_raise_research_error` exist with the exact agreed names.
- [ ] Full data-service suite green, 1 xfailed; fresh output in the PR.
- [ ] Smoke S7 passes or is reported as not run.
- [ ] Unrelated user changes remain unstaged and unmodified.

## Handoff (plan set complete)

- Inputs made available: typed analytics errors for future services; non-leaking research 500s; working `/full` technical section and `/patterns` LLM context.
- Conditions later work may assume: research status codes follow the documented 422/503/500 mapping.
- Open risks carried forward:
  - Fundamental and valuation services return all-null metrics with 200 when `.info` fails (ADR-0006 D2 path; `SPEC.md` open question on all-null valuation). Owner: follow-up ADR.
  - Seven-state section status contract. Owner: `EPIC-001` after `OQ-3`.

## Self-Review

**Spec coverage:** `CAP-CUR-DS-005` research 500s (Task 1) and swallowed `/full` sections (Task 3); the `/patterns` LLM defect found during planning (Task 2); `contracts.md` (Task 4). Status DTOs stay with `EPIC-001`.

**Step scan:** Every code step shows the code; route-by-route section names are listed explicitly.

**Type and name consistency:** `logger` is defined once in `analysis.py` (Task 2) and reused (Task 3); section labels in logs match the tests; `InsufficientDataError` subclasses `ValueError`, so Plan 5's risk test stays valid.

**Review focus:** All five items map to named tests.

**Proportion:** Error translation and two defect fixes; no DTO change.
