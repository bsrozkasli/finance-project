# Data-Service Boundary Hardening Plan 5 — Price-History Call-Site Migration Implementation Plan

**Status:** Complete (2026-10-13) — commits `363c4df`, `401cad4`, `44747f0`, `b4ba631`, `3bccd6f`. Step checkboxes were not ticked during execution; the plan-set table is the record.

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve every price-history read in the technical/pattern router and in the risk, factor, and portfolio services through `MarketDataResolver`, keeping response shapes and status codes, and make the current-system docs tell the truth about the remaining ADR-0006 exceptions.

**Architecture:** Each call site swaps its `yf.Ticker(...).history` / `yf.download` call for `get_resolver()` plus the Plan 4 helpers, then continues with its existing calculation code unchanged. Tests replace the module's `get_resolver` with a resolver over `ScriptedProvider`, so they also prove fallback. `.info` and statement reads stay direct (ADR-0006 D2) and gain a comment.

**Tech Stack:** FastAPI, pandas 3, PyPortfolioOpt, pytest, `ScriptedProvider`.

**Plan Set:** Plan 5 of 6 in `docs/superpowers/plans/2026-10-13-data-service-boundary-hardening.md`.

**Depends On:** Plan 4 — ADR-0006 `Accepted` (with the D5 answer), `adjusted` flag, `app/services/price_history.py`.

**Produces:** `get_resolver` imported at module level in `app/routers/analysis.py`, `app/services/risk_analytics_service.py`, `app/services/factor_analysis_service.py`, `app/services/portfolio_service.py` (the patch point for tests and Plan 6); updated `architecture.md`, `operations.md`, `SPEC.md`, `main.py`/`base.py` docstrings.

**Spec:** ADR-0006; `docs/spec/current-system/architecture.md` (Data-Service Boundary: "`app/routers/analysis.py::_load_history` … is a known brownfield boundary exception"); `docs/spec/current-system/contracts.md` (Data-Service API); `docs/agent/verification.md` S7.

## Locked Decisions

- Response models, field names, status codes, and query defaults stay identical: technical/pattern routes still return 404 when no provider has data and 422 for fewer than 30 candles.
- Technical/pattern history stays unadjusted (`adjusted=False`, the default). Risk and factor pass `adjusted=True` (ADR-0006 D4). Portfolio passes `adjusted=True` if D5 was accepted, otherwise `adjusted=False`; only Task 4's code line and expected kwargs depend on that answer.
- `_load_history` names the reset index column `Date` for intervals in `DAILY_OR_LONGER_INTERVALS` and `Datetime` otherwise, matching `yfinance.Ticker.history().reset_index()`, so `date_col` logic and the response `timestamp` (bar instant in UTC, `Z` suffix) are unchanged.
- The concurrency limit of 5 simultaneous history loads stays; the semaphore is renamed `history_semaphore` because it now guards the provider chain.
- Risk and factor keep their 365-day window via `fetch_daily_frame(…, lookback_days=365, include_today=True)`; portfolio keeps its end-exclusive window via `fetch_close_matrix`. Calculation code after the fetch is untouched except removing MultiIndex branches that only `yf.download` could produce.
- Expected values in new tests come from hand-worked formulas (drawdown of a 100→200→100 path is 0.5; beta of a series against itself is 1.0; 1-month momentum over 22 bars of a +1/day ramp ending at 352 is 21/331), not from running the code.

## Global Constraints

- "Preserve endpoint paths and DTO fields unless every consumer changes together." (`AGENTS.md`)
- "Keep controllers and scheduled adapters thin; business logic belongs in domain services or use cases." — routers only translate errors; services own fetching.
- "Never call live financial providers from automated tests; use boundary stubs." (`AGENTS.md`)
- "For financial calculations … Expected results must come from an independently worked formula or written requirement." (`docs/agent/verification.md`)
- Preserve unrelated working-tree changes.

## Review Focus

- **Fallback still bypassed** — with the first provider empty, the technical route must return 200 from the second provider. Task 1 `test_technical_analysis_falls_back_to_second_provider`.
- **Timestamp drift** — the technical `timestamp` must equal the last bar instant in UTC (`2024-04-09T05:00:00Z` for a New York daily bar). Task 1 `test_technical_timestamp_is_last_bar_instant_in_utc`.
- **Silent switch to unadjusted closes in risk** — risk must request `adjusted=True` for the symbol and `SPY`. Task 2 `test_risk_requests_one_year_of_adjusted_daily_bars`.
- **Portfolio window off by one** — today's partial session and bars older than the lookback must be excluded. Task 4 `test_fetch_price_matrix_uses_resolver_closes_without_live_call`.
- **Symbol with no history poisons the matrix** — a symbol with no bars must be dropped by the existing missing-ratio rule, not raise. Task 4 `test_fetch_price_matrix_drops_symbol_without_history`.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `data-service/app/routers/analysis.py:1-55` | Modify | `_load_history` through the resolver |
| `data-service/tests/test_analysis_endpoints.py` | Modify | Replace yfinance patches with resolver doubles |
| `data-service/app/services/risk_analytics_service.py:1-90` | Modify | Asset/benchmark history through the resolver |
| `data-service/tests/test_risk_analytics_service.py` | Create | Risk fetch and independent drawdown/beta checks |
| `data-service/app/services/factor_analysis_service.py:130-145,187` | Modify | Momentum/volatility history through the resolver; ADR comments on `.info` |
| `data-service/tests/test_factor_analysis_service.py` | Create | Factor fetch and independent momentum check |
| `data-service/app/services/portfolio_service.py:1-75` | Modify | Price matrix through the resolver |
| `data-service/tests/test_portfolio_service.py:1-10,123-145` | Modify | Resolver-based matrix tests |
| `data-service/main.py:1-6`, `data-service/app/providers/base.py:1-6` | Modify | Truthful boundary docstrings |
| `data-service/app/services/fundamental_analysis_service.py`, `valuation_service.py` | Modify | ADR-0006 comments at `yf.Ticker` sites |
| `docs/spec/current-system/architecture.md`, `operations.md`, `SPEC.md` | Modify | Boundary, adjustment semantics, open question |

---

## Task 1: Technical and Pattern History Through the Resolver

**Files:**
- Modify: `data-service/app/routers/analysis.py:1-55`
- Modify: `data-service/tests/test_analysis_endpoints.py` (all six existing tests; two added)

**Interfaces:**
- Consumes: `get_resolver()`; `bars_to_frame`, `DAILY_OR_LONGER_INTERVALS`; `ScriptedProvider`.
- Produces: `analysis.get_resolver` (module attribute, patch point); `_load_history(symbol: str, interval: str, range_value: str) -> pd.DataFrame` with columns `Date|Datetime, Open, High, Low, Close, Volume`.
- Preserves: `/api/v1/technical/{symbol}`, `/technical/{symbol}/signals`, `/patterns/{symbol}` request/response contracts; 404 and 422 behavior.

**Acceptance Evidence:**
- `pytest tests/test_analysis_endpoints.py -v`: 8 passed.
- `rg -n "yfinance|yf\." data-service/app/routers` prints nothing.

- [ ] **Step 1: Rewrite `tests/test_analysis_endpoints.py`**

```python
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.providers.base import OHLCVBar
from app.providers.market_data_resolver import MarketDataResolver
from app.routers import analysis
from main import app


@pytest.fixture
def client():
    return TestClient(app)


def _trend_bars(count: int, low: float, high: float, step: timedelta = timedelta(days=1)) -> list[OHLCVBar]:
    """Rising bars with Open=Close-1, High=Close+1, Low=Close-3, starting 2024-01-01 05:00 UTC."""
    start = datetime(2024, 1, 1, 5, tzinfo=timezone.utc)
    closes = np.linspace(low, high, count)
    return [
        OHLCVBar(
            timestamp=start + step * index,
            open=float(close - 1), high=float(close + 1), low=float(close - 3), close=float(close),
            volume=1_000_000,
        )
        for index, close in enumerate(closes)
    ]


@pytest.fixture
def serve_bars(monkeypatch, scripted_provider):
    def _serve(bars: list[OHLCVBar], *, first_empty: bool = False):
        providers = [scripted_provider("fx-analysis-empty", ohlcv=[])] if first_empty else []
        primary = scripted_provider("fx-analysis-primary", ohlcv=bars)
        providers.append(primary)
        monkeypatch.setattr(analysis, "get_resolver", lambda: MarketDataResolver(providers))
        return primary

    return _serve


def test_get_patterns_endpoint_smoke_test(serve_bars, client):
    serve_bars(_trend_bars(100, 101, 151))

    response = client.get("/api/v1/patterns/AAPL")

    assert response.status_code == 200
    data = response.json()
    assert data["symbol"] == "AAPL"
    assert data["interval"] == "1d"
    assert isinstance(data["patterns"], list)
    assert "detected_at" in data
    for pattern in data["patterns"]:
        assert {"pattern_type", "direction", "start_index", "end_index", "description"} <= pattern.keys()
        assert 0.0 <= pattern["confidence"] <= 1.0


def test_get_patterns_endpoint_with_custom_interval(serve_bars, client):
    primary = serve_bars(_trend_bars(100, 101, 151, step=timedelta(hours=1)))

    response = client.get("/api/v1/patterns/AAPL?interval=1h&range=1mo")

    assert response.status_code == 200
    assert response.json()["interval"] == "1h"
    assert primary.calls_for("ohlcv")[0][1] == ("AAPL", "1h", "1mo")


def test_get_patterns_endpoint_no_data(serve_bars, client):
    serve_bars([])

    assert client.get("/api/v1/patterns/INVALID").status_code == 404


def test_get_patterns_insufficient_data(serve_bars, client):
    serve_bars(_trend_bars(30, 101, 111))

    response = client.get("/api/v1/patterns/AAPL")

    assert response.status_code == 200
    data = response.json()
    assert data["patterns"] == []
    assert data["dominant_pattern"] is None


def test_get_technical_analysis_insufficient_candles_returns_422(serve_bars, client):
    serve_bars(_trend_bars(29, 101, 111))

    response = client.get("/api/v1/technical/AAPL?interval=1d&range=1mo")

    assert response.status_code == 422
    assert "At least 30 candles" in response.json()["detail"]


def test_get_technical_signals_insufficient_candles_returns_422(serve_bars, client):
    serve_bars(_trend_bars(29, 101, 111))

    response = client.get("/api/v1/technical/AAPL/signals?interval=1d&range=1mo")

    assert response.status_code == 422
    assert "At least 30 candles" in response.json()["detail"]


def test_technical_analysis_falls_back_to_second_provider(serve_bars, client):
    primary = serve_bars(_trend_bars(100, 101, 151), first_empty=True)

    response = client.get("/api/v1/technical/AAPL")

    assert response.status_code == 200
    assert primary.calls_for("ohlcv") == [("ohlcv", ("AAPL", "1d", "3mo"), {"adjusted": False})]


def test_technical_timestamp_is_last_bar_instant_in_utc(serve_bars, client):
    serve_bars(_trend_bars(100, 101, 151))

    response = client.get("/api/v1/technical/AAPL")

    assert response.json()["timestamp"] == "2024-04-09T05:00:00Z"
```

- [ ] **Step 2: Run them and confirm failure**

Run (from `data-service/`): `.\.venv\Scripts\python.exe -m pytest tests/test_analysis_endpoints.py -v`

Expected: 8 ERROR/FAIL with `AttributeError: <module 'app.routers.analysis'> has no attribute 'get_resolver'`.

- [ ] **Step 3: Replace the top of `app/routers/analysis.py` through `_load_history`**

```python
from datetime import datetime, timezone
import asyncio

import pandas as pd
from fastapi import APIRouter, HTTPException, Query, status

from app.dependencies import get_resolver
from app.models.analysis import (
    AnalysisSummaryResponse,
    TechnicalAnalysisResponse,
    SentimentAnalysisResponse,
    LlmInsightRequest,
    LlmInsightResponse,
    FullAnalysisResponse,
    PatternDetectionResponse,
    DecisionSupportRequest,
    DecisionSupportResponse,
)
from app.services.price_history import DAILY_OR_LONGER_INTERVALS, bars_to_frame
from app.services.technical_analysis_service import TechnicalAnalysisService
from app.services.pattern_detection_service import PatternDetectionService
from app.config import settings

router = APIRouter(prefix="/api/v1", tags=["analysis"])


def _to_utc_z(value: object) -> str:
    if value is None:
        return ""
    ts = pd.Timestamp(value)
    if ts.tzinfo is None:
        ts = ts.tz_localize(timezone.utc)
    else:
        ts = ts.tz_convert(timezone.utc)
    return ts.isoformat().replace("+00:00", "Z")


# Limit concurrent provider-chain history loads to protect provider rate limits.
history_semaphore = asyncio.Semaphore(5)


async def _load_history(symbol: str, interval: str, range_value: str) -> pd.DataFrame:
    async with history_semaphore:
        bars = await asyncio.to_thread(get_resolver().get_ohlcv, symbol, interval, range_value)

    if not bars:
        raise HTTPException(status_code=404, detail=f"No historical data found for symbol '{symbol}'")

    history = bars_to_frame(bars)
    history.index.name = "Date" if interval in DAILY_OR_LONGER_INTERVALS else "Datetime"
    return history.reset_index()
```

Everything below `_load_history` stays as is (Plan 6 owns the `/full` and `/patterns` fixes).

- [ ] **Step 4: Run focused and full checks**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_analysis_endpoints.py -v` — Expected: 8 passed.

Run: `rg -n "yfinance|yf\." app/routers` — Expected: no output.

Run: `.\.venv\Scripts\python.exe -m pytest -q` — Expected: green, 1 xfailed.

- [ ] **Step 5: Commit**

```powershell
git add data-service/app/routers/analysis.py data-service/tests/test_analysis_endpoints.py
git diff --cached --check
git commit -m "refactor(data-service): load technical history via resolver"
```

---

## Task 2: Risk Analytics History Through the Resolver

**Files:**
- Modify: `data-service/app/services/risk_analytics_service.py:1-90`
- Test: `data-service/tests/test_risk_analytics_service.py`

**Interfaces:**
- Consumes: `get_resolver()`; `fetch_daily_frame`.
- Produces: `risk_analytics_service.get_resolver` patch point; `RiskAnalyticsService.analyze(symbol, risk_free_rate=0.02)` unchanged signature.
- Preserves: `RiskAnalyticsResponse` shape; `ValueError` "Insufficient price data …" when fewer than 30 rows (Plan 6 turns it into `InsufficientDataError`).

**Acceptance Evidence:**
- `pytest tests/test_risk_analytics_service.py -v`: 4 passed.

- [ ] **Step 1: Write the failing tests**

```python
"""RiskAnalyticsService reads adjusted history through the resolver."""

from __future__ import annotations

import pytest

from app.providers.market_data_resolver import MarketDataResolver
from app.services import risk_analytics_service
from app.services.risk_analytics_service import RiskAnalyticsService


@pytest.fixture
def risk_history(monkeypatch, scripted_provider, bars):
    def _install(closes: list[float]):
        provider = scripted_provider("fx-risk", ohlcv=bars(closes))
        monkeypatch.setattr(risk_analytics_service, "get_resolver", lambda: MarketDataResolver([provider]))
        return provider

    return _install


def test_risk_requests_one_year_of_adjusted_daily_bars(risk_history):
    provider = risk_history([100.0 + index for index in range(300)])

    RiskAnalyticsService.analyze("AAPL")

    assert [(call[1], call[2]) for call in provider.calls_for("ohlcv")] == [
        (("AAPL", "1d", "1y"), {"adjusted": True}),
        (("SPY", "1d", "1y"), {"adjusted": True}),
    ]


def test_max_drawdown_matches_hand_worked_price_path(risk_history):
    # 100 -> 200 -> 100: peak-to-trough decline is (200 - 100) / 200 = 0.5.
    risk_history([100.0] * 100 + [200.0] * 100 + [100.0] * 100)

    assert RiskAnalyticsService.analyze("AAPL").max_drawdown == pytest.approx(0.5)


def test_asset_identical_to_benchmark_has_unit_beta(risk_history):
    # cov(r, r) / var(r) = 1 for any non-constant return series.
    risk_history([100.0 + (index % 5) for index in range(300)])

    assert RiskAnalyticsService.analyze("AAPL").daily.beta == pytest.approx(1.0)


def test_fewer_than_thirty_sessions_is_insufficient(risk_history):
    risk_history([100.0 + index for index in range(29)])

    with pytest.raises(ValueError, match="Insufficient price data"):
        RiskAnalyticsService.analyze("AAPL")
```

- [ ] **Step 2: Run them and confirm failure**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_risk_analytics_service.py -v`

Expected: 4 ERROR with `AttributeError: … has no attribute 'get_resolver'`.

- [ ] **Step 3: Implement**

Imports: remove `import yfinance as yf`; change `from datetime import datetime, timedelta, timezone` to `from datetime import datetime, timezone`; add

```python
from app.dependencies import get_resolver
from app.services.price_history import fetch_daily_frame
```

and the constant `_LOOKBACK_DAYS = 365` next to `_MARKET_BENCHMARK`. In the module docstring replace "using yfinance price data" with "using adjusted daily history from the provider resolver".

In `analyze`, replace the `end`/`start` lines and both `yf.download` calls with:

```python
        resolver = get_resolver()
        # Adjusted closes keep the former yfinance.download(auto_adjust=True) semantics (ADR-0006 D4).
        asset_df = fetch_daily_frame(
            resolver, symbol, lookback_days=_LOOKBACK_DAYS, adjusted=True, include_today=True
        )
        market_df = fetch_daily_frame(
            resolver, _MARKET_BENCHMARK, lookback_days=_LOOKBACK_DAYS, adjusted=True, include_today=True
        )
```

Replace the two MultiIndex blocks with:

```python
        asset_close = asset_df["Close"]
        market_close = market_df["Close"]
```

- [ ] **Step 4: Run focused and full checks**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_risk_analytics_service.py -v` — Expected: 4 passed.

Run: `.\.venv\Scripts\python.exe -m ruff check --select F401,F811 app/services/risk_analytics_service.py` — Expected: `All checks passed!`

Run: `.\.venv\Scripts\python.exe -m pytest -q` — Expected: green, 1 xfailed.

- [ ] **Step 5: Commit**

```powershell
git add data-service/app/services/risk_analytics_service.py data-service/tests/test_risk_analytics_service.py
git diff --cached --check
git commit -m "refactor(data-service): read risk history via resolver"
```

---

## Task 3: Factor Momentum and Volatility History Through the Resolver

**Files:**
- Modify: `data-service/app/services/factor_analysis_service.py:130-145` (`analyze_factors`) and `:187` (`analyze_institutional`, comment only)
- Test: `data-service/tests/test_factor_analysis_service.py`

**Interfaces:**
- Consumes: `get_resolver()`; `fetch_daily_frame`.
- Produces: `factor_analysis_service.get_resolver` patch point.
- Preserves: `FactorAnalysisResponse`/`InstitutionalScoreResponse` shapes; `.info` and statement reads (ADR-0006 D2) still via `yf.Ticker`.

**Acceptance Evidence:**
- `pytest tests/test_factor_analysis_service.py -v`: 1 passed.
- `rg -n "yf\.download" app` prints only `portfolio_analytics_service.py` (ADR-0006 D3) after Task 4.

- [ ] **Step 1: Write the failing test**

```python
"""FactorAnalysisService reads momentum/volatility history through the resolver."""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from app.providers.market_data_resolver import MarketDataResolver
from app.services import factor_analysis_service
from app.services.factor_analysis_service import FactorAnalysisService


def test_factor_momentum_uses_resolver_adjusted_history(monkeypatch, scripted_provider, bars):
    # ADR-0006 D2: .info remains a direct yfinance read; stub it with an empty dict.
    monkeypatch.setattr(
        factor_analysis_service,
        "yf",
        SimpleNamespace(Ticker=lambda symbol: SimpleNamespace(ticker=symbol, info={})),
    )
    provider = scripted_provider("fx-factor", ohlcv=bars([100.0 + index for index in range(253)]))
    monkeypatch.setattr(factor_analysis_service, "get_resolver", lambda: MarketDataResolver([provider]))

    result = FactorAnalysisService.analyze_factors("AAPL")

    # Ramp ends at 352; 22 sessions back is 331, so 1-month return = 21 / 331.
    assert result.scores.momentum_components["return_1m"] == pytest.approx(21 / 331)
    assert [(call[1][0], call[2]) for call in provider.calls_for("ohlcv")] == [
        ("AAPL", {"adjusted": True}),
        ("SPY", {"adjusted": True}),
    ]
```

- [ ] **Step 2: Run it and confirm failure**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_factor_analysis_service.py -v`

Expected: ERROR `AttributeError: … has no attribute 'get_resolver'`.

- [ ] **Step 3: Implement**

Add imports and constant:

```python
from app.dependencies import get_resolver
from app.services.price_history import fetch_daily_frame

_LOOKBACK_DAYS = 365
```

In `analyze_factors`, replace the `end`/`start` lines and both `yf.download` calls with:

```python
        ticker = yf.Ticker(symbol)  # .info stays a direct read: ADR-0006 D2 exception
        info = cls._safe_info(ticker)

        resolver = get_resolver()
        # Adjusted closes keep the former yfinance.download(auto_adjust=True) semantics (ADR-0006 D4).
        price_df = fetch_daily_frame(
            resolver, symbol, lookback_days=_LOOKBACK_DAYS, adjusted=True, include_today=True
        )
        market_df = fetch_daily_frame(
            resolver, _MARKET_BENCHMARK, lookback_days=_LOOKBACK_DAYS, adjusted=True, include_today=True
        )
```

In `analyze_institutional`, append `# .info and statements stay direct reads: ADR-0006 D2 exception` to the `ticker = yf.Ticker(symbol)` line. Remove `timedelta` from the `datetime` import only if ruff reports it unused.

- [ ] **Step 4: Run focused and full checks**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_factor_analysis_service.py -v` — Expected: 1 passed.

Run: `.\.venv\Scripts\python.exe -m ruff check --select F401,F811 app/services/factor_analysis_service.py` — Expected: `All checks passed!`

Run: `.\.venv\Scripts\python.exe -m pytest -q` — Expected: green, 1 xfailed.

- [ ] **Step 5: Commit**

```powershell
git add data-service/app/services/factor_analysis_service.py data-service/tests/test_factor_analysis_service.py
git diff --cached --check
git commit -m "refactor(data-service): read factor price history via resolver"
```

---

## Task 4: Portfolio Price Matrix Through the Resolver

**Files:**
- Modify: `data-service/app/services/portfolio_service.py:1-75` (`_fetch_price_matrix`)
- Modify: `data-service/tests/test_portfolio_service.py` (imports; replace `test_fetch_price_matrix_uses_yfinance_close_prices_without_live_call`)

**Interfaces:**
- Consumes: `get_resolver()`; `fetch_close_matrix`.
- Produces: `portfolio_service.get_resolver` patch point; `_fetch_price_matrix(symbols, lookback_days) -> pd.DataFrame` (rows: session dates, columns: tickers).
- Preserves: `MIN_ASSETS`, `MAX_MISSING_RATIO`, cleaning order, `ValueError` messages, router 400 mapping, all optimizer tests (they mock `_fetch_price_matrix`).

**Acceptance Evidence:**
- `pytest tests/test_portfolio_service.py -v`: all passed (existing optimizer tests + 3 matrix tests).

- [ ] **Step 1: Replace the yfinance matrix test**

In `tests/test_portfolio_service.py`, delete `import yfinance as yf` and `test_fetch_price_matrix_uses_yfinance_close_prices_without_live_call`; add imports and tests:

```python
from datetime import datetime, timedelta, timezone

from app.providers.base import OHLCVBar
from app.providers.market_data_resolver import MarketDataResolver
from app.services import portfolio_service


def _session_bar(days_ago: int, close: float) -> OHLCVBar:
    session = datetime.now(timezone.utc).date() - timedelta(days=days_ago)
    return OHLCVBar(
        timestamp=datetime(session.year, session.month, session.day, 5, tzinfo=timezone.utc),
        open=close, high=close, low=close, close=close, volume=1000,
    )


def _install_resolver(monkeypatch, scripted_provider, ohlcv: dict):
    provider = scripted_provider("fx-portfolio", ohlcv=ohlcv)
    monkeypatch.setattr(portfolio_service, "get_resolver", lambda: MarketDataResolver([provider]))
    return provider


def test_fetch_price_matrix_uses_resolver_closes_without_live_call(monkeypatch, scripted_provider):
    today = datetime.now(timezone.utc).date()
    provider = _install_resolver(monkeypatch, scripted_provider, {
        # Day 50 is outside the 45-day lookback; day 0 (today) is excluded by the end-exclusive window.
        "AAPL": [_session_bar(50, 1.0)] + [_session_bar(n, 104.0 - n) for n in (4, 3, 2, 1, 0)],
        "MSFT": [_session_bar(n, 204.0 - n) for n in (4, 3, 2, 1, 0)],
    })

    prices = PortfolioService._fetch_price_matrix([" aapl ", "MSFT"], lookback_days=45)

    expected = pd.DataFrame(
        {"AAPL": [100.0, 101.0, 102.0, 103.0], "MSFT": [200.0, 201.0, 202.0, 203.0]},
        index=pd.DatetimeIndex([pd.Timestamp(today - timedelta(days=n)) for n in (4, 3, 2, 1)], name="Date"),
    )
    pd.testing.assert_frame_equal(prices, expected, check_index_type=False, check_freq=False)
    assert [(call[1], call[2]) for call in provider.calls_for("ohlcv")] == [
        (("AAPL", "1d", "3mo"), {"adjusted": True}),
        (("MSFT", "1d", "3mo"), {"adjusted": True}),
    ]


def test_fetch_price_matrix_drops_symbol_without_history(monkeypatch, scripted_provider):
    _install_resolver(monkeypatch, scripted_provider, {
        "AAPL": [_session_bar(n, 100.0 + n) for n in (4, 3, 2, 1)],
        "MSFT": [],
    })

    prices = PortfolioService._fetch_price_matrix(["AAPL", "MSFT"], lookback_days=45)

    assert list(prices.columns) == ["AAPL"]


def test_fetch_price_matrix_raises_when_no_symbol_has_history(monkeypatch, scripted_provider):
    _install_resolver(monkeypatch, scripted_provider, {})

    with pytest.raises(ValueError, match="No historical price data"):
        PortfolioService._fetch_price_matrix(["AAPL", "MSFT"], lookback_days=45)
```

If ADR-0006 D5 was rejected, change both `{"adjusted": True}` to `{"adjusted": False}` in the first test.

- [ ] **Step 2: Run them and confirm failure**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_portfolio_service.py -v`

Expected: the 3 new tests ERROR with `AttributeError: … has no attribute 'get_resolver'`; existing optimizer tests pass.

- [ ] **Step 3: Implement `_fetch_price_matrix`**

Imports: remove `import yfinance as yf`; add

```python
from app.dependencies import get_resolver
from app.services.price_history import fetch_close_matrix
```

Replace the method body after the `MIN_ASSETS` check:

```python
        # Adjusted closes keep splits and dividends out of expected returns (ADR-0006 D5).
        prices = fetch_close_matrix(get_resolver(), tickers, lookback_days=lookback_days, adjusted=True)

        prices = prices.dropna(how="all")
        if prices.empty:
            raise ValueError("No historical price data was returned for the requested symbols")

        missing_ratio = prices.isna().mean()
        prices = prices.loc[:, missing_ratio <= cls.MAX_MISSING_RATIO]
        prices = prices.ffill()
        prices = prices.dropna(how="any")

        if prices.empty:
            raise ValueError("Price data is empty after cleaning missing values")

        return prices
```

If D5 was rejected, pass `adjusted=False` and replace the comment with `# Unadjusted closes by maintainer decision (ADR-0006 D5).`

- [ ] **Step 4: Run focused and full checks**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_portfolio_service.py -v` — Expected: all passed.

Run: `.\.venv\Scripts\python.exe -m ruff check --select F401,F811 app/services/portfolio_service.py tests/test_portfolio_service.py` — Expected: `All checks passed!`

Run: `.\.venv\Scripts\python.exe -m pytest -q` — Expected: green, 1 xfailed.

- [ ] **Step 5: Commit**

```powershell
git add data-service/app/services/portfolio_service.py data-service/tests/test_portfolio_service.py
git diff --cached --check
git commit -m "refactor(data-service): build portfolio price matrix via resolver"
```

---

## Task 5: Boundary Comments and Current-System Docs

**Files:**
- Modify: `data-service/main.py:1-6`, `data-service/app/providers/base.py:1-6`
- Modify: `data-service/app/services/fundamental_analysis_service.py:35`, `data-service/app/services/valuation_service.py:135` (comment only)
- Modify: `docs/spec/current-system/architecture.md` (mermaid diagram, Data-Service Boundary)
- Modify: `docs/spec/current-system/operations.md` (paragraph after the resolver description)
- Modify: `SPEC.md` (Open Questions)

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: docs that state which reads use the resolver and which are ADR-0006 exceptions.
- Preserves: all code behavior.

**Acceptance Evidence:**
- `rg -n "^import yfinance" data-service/app` lists exactly `yahoo_provider.py`, `fundamental_analysis_service.py`, `factor_analysis_service.py`, `valuation_service.py`, `portfolio_analytics_service.py`.
- `rg -n "_load_history.*directly" docs/spec` prints nothing.

- [ ] **Step 1: Gate — confirm the stale claims exist**

Run (repo root): `rg -n "never from|_load_history. helper directly|direct yfinance access in .app/routers/analysis.py." data-service/main.py docs/spec/current-system/architecture.md SPEC.md`

Expected: three matches (the claims this task replaces).

- [ ] **Step 2: Update code docstrings and comments**

`data-service/main.py` module docstring:

```python
"""
FastAPI data-service entry point.

Price history reaches every route through the MarketDataResolver. Company
`.info` and financial-statement reads in the fundamental, factor, and valuation
services remain direct yfinance exceptions recorded in ADR-0006.
"""
```

`data-service/app/providers/base.py` module docstring — append the sentence: `Recorded exceptions to this rule are listed in docs/adr/0006-data-service-price-history-through-resolver.md.`

`fundamental_analysis_service.py` and `valuation_service.py` — append `# .info and statements stay direct reads: ADR-0006 D2 exception` to each `ticker = yf.Ticker(symbol)` line.

- [ ] **Step 3: Update `docs/spec/current-system/architecture.md`**

In the runtime mermaid diagram add after `DS --> PR[Provider resolver]`:

```text
    DS -.->|.info / statements, ADR-0006 exception| YF
```

Replace the "Provider access belongs in provider/service code. The current `app/routers/analysis.py::_load_history` helper directly calls yfinance …" bullet with:

```markdown
- Price history for every route and analytics service is read through
  `MarketDataResolver.get_ohlcv` with an explicit `adjusted` flag (ADR-0006).
  Company `.info` and financial-statement reads in the fundamental, factor, and
  valuation services are recorded direct-yfinance exceptions; do not add new
  direct provider calls. Agent functions receive prepared metrics and narrative
  context only; they do not call providers or tools and do not recalculate
  financial metrics.
```

- [ ] **Step 4: Update `docs/spec/current-system/operations.md`**

After the paragraph that starts "The data-service `MarketDataResolver` tries active providers in registration order", add:

```markdown
Price-history consumers state adjustment explicitly (ADR-0006): `/api/v1/prices`
and technical/pattern routes request unadjusted bars; risk analytics, factor
momentum/volatility, and portfolio optimization request split- and
dividend-adjusted bars. Daily bars are indexed by exchange session date.
```

If D5 was rejected, move "portfolio optimization" to the unadjusted list.

- [ ] **Step 5: Update `SPEC.md` Open Questions**

Replace the bullet "When will direct yfinance access in `app/routers/analysis.py` be moved behind the provider/service boundary used by the rest of the data-service?" with:

```markdown
- When will a follow-up to ADR-0006 extend `IMarketDataProvider` so the
  fundamental, factor, and valuation `.info`/statement reads leave direct
  yfinance, and should unreachable `portfolio_analytics_service.py` be removed?
```

- [ ] **Step 6: Run checks**

Run (repo root): `rg -n "^import yfinance" data-service/app` — Expected: the five files listed in Acceptance Evidence.

Run: `rg -n "_load_history. helper directly" docs/spec` — Expected: no output.

Run (from `data-service/`): `.\.venv\Scripts\python.exe -m pytest -q` — Expected: green, 1 xfailed.

- [ ] **Step 7: Commit**

```powershell
git add data-service/main.py data-service/app/providers/base.py data-service/app/services/fundamental_analysis_service.py data-service/app/services/valuation_service.py docs/spec/current-system/architecture.md docs/spec/current-system/operations.md SPEC.md
git diff --cached --check
git commit -m "docs(spec): record resolver price-history boundary"
```

---

## Plan Exit Criteria

- [ ] Every task has its own focused verification evidence.
- [ ] `get_resolver` is a module attribute of `analysis`, `risk_analytics_service`, `factor_analysis_service`, `portfolio_service`.
- [ ] Full data-service suite green, 1 xfailed; fresh output in the PR.
- [ ] Smoke S7 (insufficient candles → 422) still passes against a running data-service, or is reported as not run.
- [ ] Unrelated user changes remain unstaged and unmodified.

## Handoff to Plan 6

- Inputs made available: resolver-backed `_load_history`; `get_resolver` patch points; risk still raises `ValueError` "Insufficient price data".
- Conditions Plan 6 may assume: analysis tests use `serve_bars`/`ScriptedProvider`; no route calls yfinance.
- Open risks carried forward: ADR-0006 D2 exceptions (owner: follow-up ADR); risk aligns asset and benchmark by tail length, not by date (pre-existing; owner: `OQ-4` financial policy).

## Self-Review

**Spec coverage:** ADR-0006 D1 for all five price-history consumers (Tasks 1–4); D2 comments and D3 left untouched (Task 5); `architecture.md` known-exception text, `operations.md` adjustment semantics, `SPEC.md` open question (Task 5).

**Step scan:** Each step is one edit or one command; the D5 branch is stated as an exact one-line change.

**Type and name consistency:** `get_resolver`, `fetch_daily_frame`, `fetch_close_matrix`, `bars_to_frame`, `DAILY_OR_LONGER_INTERVALS`, `_LOOKBACK_DAYS` match Plan 4; `ScriptedProvider.calls_for` tuples are `(operation, (symbol, interval, period), {"adjusted": …})`.

**Review focus:** All five items map to named tests.

**Proportion:** Fetch lines replaced; calculations untouched.
