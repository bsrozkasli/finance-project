# Data-Service Boundary Hardening Plan 4 — Resolver Price-History Capability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record the provider-boundary decision as ADR-0006 and give the resolver what analytics need to stop calling yfinance for price history: an explicit `adjusted` flag, a Tiingo daily-only guard, and tested helpers that turn bars into the DataFrames the services already consume.

**Architecture:** Task 1 writes ADR-0006 and **stops for maintainer approval**. Tasks 2–4 extend `IMarketDataProvider.get_ohlcv` with `adjusted: bool = False`, implement it in Yahoo, Tiingo, Finnhub, and the resolver, and add `app/services/price_history.py`. No route or analytics service changes yet; Plan 5 migrates call sites.

**Tech Stack:** Python `Protocol`, yfinance 1.4.1 `Ticker.history(auto_adjust=…)`, Tiingo EOD `adj*` fields, pandas 3 `DatetimeIndex`, pytest.

**Plan Set:** Plan 4 of 6 in `docs/superpowers/plans/2026-10-13-data-service-boundary-hardening.md`.

**Depends On:** Plan 1 (`ScriptedProvider`, `make_bars`, characterization suite).

**Produces:**
- `docs/adr/0006-data-service-price-history-through-resolver.md` (Accepted) and its `docs/adr/README.md` row.
- `IMarketDataProvider.get_ohlcv(symbol, interval="1d", period="1y", adjusted=False)` and `MarketDataResolver.get_ohlcv(…, adjusted=False)`.
- `app/services/price_history.py`: `OHLCV_COLUMNS`, `DAILY_OR_LONGER_INTERVALS`, `bars_to_frame`, `to_trading_dates`, `covering_period`, `fetch_daily_frame`, `fetch_close_matrix`.

**Spec:** `docs/product/evidence/data-service.md` `CAP-CUR-DS-004`; `DOC-CONFLICT-001`; `docs/spec/current-system/architecture.md` (Data-Service Boundary); `docs/spec/current-system/operations.md` (Provider Responsibilities); `SPEC.md` open question on direct yfinance in `analysis.py`.

## Locked Decisions

These are the ADR-0006 decisions. Task 1 records them; Tasks 2–4 implement only D4–D7.

- **D1 — Scope.** Every *price-history* read goes through `MarketDataResolver.get_ohlcv`: technical and pattern routes, risk analytics, factor momentum/low-volatility, portfolio optimize and efficient frontier.
- **D2 — Recorded exception.** `Ticker.info` and statement DataFrames in `fundamental_analysis_service.py`, `factor_analysis_service.py` (value, growth, quality, institutional), and `valuation_service.py` stay direct yfinance until a later ADR extends the provider protocol. Each such call site gets a one-line comment naming ADR-0006 (Plan 5).
- **D3 — Unreachable code.** `portfolio_analytics_service.py` has no route or caller. It is neither migrated nor deleted here.
- **D4 — Adjustment is explicit.** `get_ohlcv` gains `adjusted: bool = False`. `False` keeps today's unadjusted bars for `/api/v1/prices` and technical/pattern routes. Risk and factor pass `True`, preserving their current `yf.download` default (`auto_adjust=True` in yfinance 1.4.1). Yahoo maps the flag to `auto_adjust`; Tiingo maps it to `adjOpen/adjHigh/adjLow/adjClose/adjVolume`; Finnhub stays `[]`.
- **D5 — Portfolio uses adjusted closes (behavior change, needs approval).** Portfolio optimization and the efficient frontier currently use *unadjusted* closes (`auto_adjust=False`), so a split inside the lookback appears as a large negative return and dividends are ignored. The ADR proposes `adjusted=True`. If the maintainer rejects D5, Plan 5 Task 4 passes `adjusted=False` and its expected call kwargs flip; nothing else changes.
- **D6 — No wrong-granularity fallback.** Tiingo serves daily bars only. For any `interval != "1d"` it returns `[]` without an HTTP call, so the resolver moves on instead of serving daily bars labeled as intraday or weekly. In unadjusted mode Tiingo no longer substitutes `adjClose` when `close` is missing.
- **D7 — Daily session dates and windows.** Daily bars are re-indexed to tz-naive session dates by rounding the UTC timestamp to the nearest day (recovers exchange-local dates for UTC−11…UTC+11, matching `yf.download`'s tz-naive daily index). Fixed-day lookbacks request the smallest provider period that covers them (`covering_period`) and trim to `[today − lookback_days, today]`, or `[…, today)` for portfolio to keep the old end-exclusive `yf.download(start, end)` window.

## Global Constraints

- "Represent provider failure explicitly as unavailable, insufficient, empty, partial, or stale data; never replace missing evidence with synthetic values." (`AGENTS.md`)
- "Provider-chain changes are incomplete without tests for success, empty response, provider failure, and fallback ordering." (`operations.md`)
- "When sources conflict, prefer the stricter rule for … financial correctness, and provider degradation. Stop and ask if the conflict cannot be resolved safely." (`AGENTS.md`) — hence the Task 1 gate.
- Architecture decisions live in `docs/adr/`; a new ADR starts `Status: Proposed` and is added to the README table in the same commit (`docs/adr/README.md`).

## Review Focus

- **Intraday request silently served daily bars** — Tiingo with `interval="1h"` must return `[]` and make no HTTP call. Task 3 `test_non_daily_interval_returns_empty_without_http_call`.
- **Adjusted and unadjusted values mixed** — unadjusted Tiingo rows missing `close` must be skipped, not filled from `adjClose`. Task 3 `test_unadjusted_request_never_substitutes_adjusted_close`.
- **Non-US session dates shift by a day** — a Tokyo midnight bar (`15:00Z` previous day) must map to the Tokyo session date. Task 4 `test_to_trading_dates_recovers_exchange_session_date`.
- **Lookback window too short** — `lookback_days=29` must not request `1mo` (Yahoo `1mo` can be 28 days). Task 4 `test_covering_period`.
- **Default flips to adjusted** — callers that pass nothing must still get unadjusted bars. Task 2 `test_yahoo_defaults_to_unadjusted_prices`.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `docs/adr/0006-data-service-price-history-through-resolver.md` | Create | Decision record D1–D7 |
| `docs/adr/README.md` | Modify | ADR list row |
| `data-service/app/providers/base.py` | Modify | `get_ohlcv` protocol signature and docstring |
| `data-service/app/providers/yahoo_provider.py` | Modify | `adjusted` → `auto_adjust` |
| `data-service/app/providers/finnhub_provider.py` | Modify | Accept `adjusted` |
| `data-service/app/providers/tiingo_provider.py` | Modify | `adjusted` fields; daily-only guard |
| `data-service/app/providers/market_data_resolver.py` | Modify | Forward `adjusted` |
| `data-service/app/services/price_history.py` | Create | Bars → DataFrames, windows, matrices |
| `data-service/tests/test_market_data_resolver_metrics.py` | Modify | Doubles accept `adjusted` |
| `data-service/tests/test_ohlcv_adjustment.py` | Create | Yahoo/Finnhub/resolver flag tests |
| `data-service/tests/test_tiingo_provider.py` | Create | Tiingo field and interval tests |
| `data-service/tests/test_price_history.py` | Create | Helper tests |

---

## Task 1: ADR-0006 and Approval Gate

**Files:**
- Create: `docs/adr/0006-data-service-price-history-through-resolver.md`
- Modify: `docs/adr/README.md` (ADR list)

**Interfaces:**
- Consumes: evidence `CAP-CUR-DS-004`, `DOC-CONFLICT-001`.
- Produces: ADR-0006 with decisions D1–D7, first `Proposed`, then `Accepted` after approval.
- Preserves: ADR-0001…0005 unchanged.

**Acceptance Evidence:**
- `rg -n "ADR-0006" docs/adr/README.md` prints one row.
- Maintainer approval (including the D5 choice) is recorded in the PR or chat before Task 2 starts.

- [ ] **Step 1: Confirm ADR-0006 does not exist**

Run (repo root): `Test-Path docs/adr/0006-data-service-price-history-through-resolver.md`

Expected: `False`.

- [ ] **Step 2: Create the ADR**

```markdown
# ADR-0006: Data-Service Price History Through the Provider Resolver

Date: 2026-10-13
Status: Proposed
Deciders: Development team

## Context

`MarketDataResolver` gives the data-service ordered provider fallback, health
tracking, blacklisting, and Prometheus metrics. The audit (`CAP-CUR-DS-004`,
`DOC-CONFLICT-001`) found that the technical/pattern router and the risk,
factor, valuation, fundamental, and portfolio services call yfinance directly,
bypassing all of that. The direct calls also hide two financial-semantics facts:
risk and factor use adjusted closes (`yf.download` defaults to
`auto_adjust=True` in yfinance 1.4.1), while technical analysis and portfolio
optimization use unadjusted closes.

## Decision

1. **D1** Every price-history read goes through `MarketDataResolver.get_ohlcv`:
   technical and pattern routes, risk analytics, factor momentum and
   low-volatility, portfolio optimize and efficient frontier.
2. **D2** `Ticker.info` and financial-statement DataFrames in the fundamental,
   factor (value, growth, quality, institutional), and valuation services remain
   direct yfinance reads until a later ADR extends `IMarketDataProvider`. Each
   call site carries a comment naming this ADR.
3. **D3** `portfolio_analytics_service.py` has no route or caller; it is not
   migrated. Removing it is a separate decision.
4. **D4** `get_ohlcv` takes `adjusted: bool = False`. Unadjusted bars remain the
   default for `/api/v1/prices` and technical/pattern routes. Risk and factor
   request adjusted bars, preserving their current numbers. Yahoo maps the flag
   to `auto_adjust`; Tiingo maps it to its `adj*` fields; Finnhub returns `[]`.
5. **D5** Portfolio optimization and the efficient frontier request adjusted
   closes, so splits and dividends no longer distort expected returns and
   covariance. This changes their numerical output.
6. **D6** A provider that cannot serve the requested interval returns `[]`.
   Tiingo is daily-only, so it never serves daily bars for intraday or weekly
   requests. Unadjusted Tiingo bars never fall back to `adjClose`.
7. **D7** Daily bars are indexed by session date: the UTC timestamp rounded to
   the nearest day, which recovers exchange-local dates between UTC−11 and
   UTC+11. Fixed-day lookbacks request the smallest covering provider period and
   trim to `[today − N days, today]`; portfolio excludes today to keep the
   former end-exclusive window.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Keep direct yfinance and document every exception | Leaves risk, factor, and portfolio without fallback, health, or metrics, and keeps the entry-point contract false. |
| Migrate `.info`/statements in the same change | Needs a much larger provider protocol and a field mapping per provider; it would block the price-history fix on an unrelated design. |
| Add `start`/`end` dates to the protocol | Tiingo and Yahoo both accept periods; a covering period plus trimming reaches the same window without a protocol-wide change. |
| Keep unadjusted closes for portfolio | Preserves today's numbers but keeps split/dividend distortion in optimizer inputs. |

## Consequences

### Positive

- Price-history analytics gain Tiingo fallback, provider health, blacklisting,
  and resolver metrics.
- Adjustment semantics become explicit and testable at every call site.
- Intraday and weekly requests can no longer be answered with daily bars.

### Negative / trade-offs

- Portfolio optimizer output changes for symbols with splits or dividends in the
  lookback (D5).
- Risk/factor windows move from `start=now−365d` to period `1y` trimmed to the
  same 365-day window; a boundary bar may differ.
- Session-date rounding is wrong for exchanges at UTC+12 or later (for example
  NZX daylight time).
- D2 call sites still bypass the resolver until a follow-up ADR.

## References

- `docs/product/evidence/data-service.md` (`CAP-CUR-DS-004`)
- `docs/product/evidence/legacy-document-conflicts.md` (`DOC-CONFLICT-001`)
- `docs/spec/current-system/architecture.md` (Data-Service Boundary)
- `docs/spec/current-system/operations.md` (Provider Responsibilities)
- `data-service/app/providers/market_data_resolver.py`
- `data-service/app/services/price_history.py`
```

- [ ] **Step 3: Add the README row** (after ADR-0005)

```markdown
| [ADR-0006](0006-data-service-price-history-through-resolver.md) | Data-Service Price History Through the Provider Resolver | Proposed |
```

- [ ] **Step 4: Commit the proposal**

```powershell
git add docs/adr/0006-data-service-price-history-through-resolver.md docs/adr/README.md
git diff --cached --check
git commit -m "docs(adr): propose data-service price history via resolver"
```

- [ ] **Step 5: STOP — request maintainer approval**

Ask the maintainer to accept ADR-0006 and explicitly confirm or reject **D5**. Do not start Task 2 without an answer. On approval, set `Status: Accepted` in the ADR and the README row (if D5 is rejected, rewrite D5 as "Portfolio keeps unadjusted closes" and move the "Keep unadjusted closes" row out of the rejected alternatives), then:

```powershell
git add docs/adr/0006-data-service-price-history-through-resolver.md docs/adr/README.md
git diff --cached --check
git commit -m "docs(adr): accept ADR-0006 resolver price history"
```

---

## Task 2: `adjusted` Flag Through Protocol, Yahoo, Finnhub, and Resolver

**Files:**
- Modify: `data-service/app/providers/base.py` (`IMarketDataProvider.get_ohlcv`)
- Modify: `data-service/app/providers/yahoo_provider.py` (`get_ohlcv`)
- Modify: `data-service/app/providers/finnhub_provider.py:146-153`
- Modify: `data-service/app/providers/market_data_resolver.py` (`get_ohlcv`)
- Modify: `data-service/tests/test_market_data_resolver_metrics.py:19,41`
- Test: `data-service/tests/test_ohlcv_adjustment.py`

**Interfaces:**
- Consumes: `ScriptedProvider`, `bars` (Plan 1).
- Produces: `get_ohlcv(self, symbol: str, interval: str = "1d", period: str = "1y", adjusted: bool = False) -> list[OHLCVBar]` on the protocol, every provider, and `MarketDataResolver`. The resolver calls `provider.get_ohlcv(symbol, interval, period, adjusted=adjusted)`.
- Preserves: default unadjusted behavior; `/api/v1/prices` output; every Plan 1 test.

**Acceptance Evidence:**
- `pytest tests/test_ohlcv_adjustment.py -v`: 6 passed.
- Full suite green, 1 xfailed.

- [ ] **Step 1: Write the failing tests**

```python
"""The adjusted flag flows from callers through the resolver to providers."""

from __future__ import annotations

from types import SimpleNamespace

import pandas as pd
import pytest

from app.providers import yahoo_provider
from app.providers.finnhub_provider import FinnhubProvider
from app.providers.market_data_resolver import MarketDataResolver
from app.providers.yahoo_provider import YahooProvider


class FakeTicker:
    history_kwargs: list[dict] = []

    def __init__(self, symbol: str) -> None:
        self.symbol = symbol

    def history(self, **kwargs):
        FakeTicker.history_kwargs.append(kwargs)
        index = pd.DatetimeIndex(["2026-01-02 00:00"], tz="America/New_York")
        return pd.DataFrame(
            {"Open": [10.0], "High": [11.0], "Low": [9.0], "Close": [10.5], "Volume": [100]},
            index=index,
        )


@pytest.fixture
def fake_yfinance(monkeypatch):
    FakeTicker.history_kwargs = []
    monkeypatch.setattr(yahoo_provider, "yf", SimpleNamespace(Ticker=FakeTicker))
    return FakeTicker


@pytest.mark.parametrize("adjusted", [False, True])
def test_yahoo_maps_adjusted_flag_to_auto_adjust(fake_yfinance, adjusted):
    bars = YahooProvider().get_ohlcv("AAPL", "1d", "1mo", adjusted=adjusted)

    assert fake_yfinance.history_kwargs == [
        {"period": "1mo", "interval": "1d", "auto_adjust": adjusted, "actions": False}
    ]
    assert [bar.close for bar in bars] == [10.5]


def test_yahoo_defaults_to_unadjusted_prices(fake_yfinance):
    YahooProvider().get_ohlcv("AAPL")

    assert fake_yfinance.history_kwargs[0]["auto_adjust"] is False


@pytest.mark.parametrize("adjusted", [False, True])
def test_resolver_forwards_adjusted_flag(scripted_provider, bars, adjusted):
    provider = scripted_provider("fx-adjusted-forward", ohlcv=bars([1.0]))

    MarketDataResolver([provider]).get_ohlcv("AAPL", "1d", "1y", adjusted=adjusted)

    assert provider.calls_for("ohlcv") == [("ohlcv", ("AAPL", "1d", "1y"), {"adjusted": adjusted})]


def test_finnhub_ohlcv_accepts_adjusted_and_stays_empty():
    assert FinnhubProvider(api_key="test-finnhub-key").get_ohlcv("AAPL", adjusted=True) == []
```

- [ ] **Step 2: Run them and confirm failure**

Run (from `data-service/`): `.\.venv\Scripts\python.exe -m pytest tests/test_ohlcv_adjustment.py -v`

Expected: FAIL — `TypeError: … got an unexpected keyword argument 'adjusted'` for Yahoo, Finnhub, and the resolver.

- [ ] **Step 3: Implement**

`app/providers/base.py` — protocol method:

```python
    def get_ohlcv(
        self,
        symbol: str,
        interval: str = "1d",
        period: str = "1y",
        adjusted: bool = False,
    ) -> list[OHLCVBar]:
        """
        Fetch historical OHLCV bars.

        Args:
            symbol:   Ticker symbol (e.g. 'AAPL').
            interval: Bar interval compatible with the provider ('1d', '1h', …).
            period:   Lookback period ('1mo', '3mo', '1y', …).
            adjusted: True for split- and dividend-adjusted prices (ADR-0006).

        Returns:
            Non-null, possibly empty list of bars in ascending timestamp order.
            Empty when the provider cannot serve the interval or adjustment.
        """
        ...
```

`app/providers/yahoo_provider.py` — signature gains `adjusted: bool = False`; the history call becomes `ticker.history(period=period, interval=interval, auto_adjust=adjusted, actions=False)`.

`app/providers/finnhub_provider.py` — signature gains `adjusted: bool = False`; body unchanged.

`app/providers/market_data_resolver.py` — `get_ohlcv(self, symbol, interval="1d", period="1y", adjusted: bool = False)`; inside the loop call `provider.get_ohlcv(symbol, interval, period, adjusted=adjusted)`.

`tests/test_market_data_resolver_metrics.py` — both doubles become `def get_ohlcv(self, symbol: str, interval: str = "1d", period: str = "1y", adjusted: bool = False):`.

- [ ] **Step 4: Run focused and full checks**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_ohlcv_adjustment.py tests/test_market_data_resolver_metrics.py -v` — Expected: all passed.

Run: `.\.venv\Scripts\python.exe -m pytest -q` — Expected: green, 1 xfailed.

- [ ] **Step 5: Commit**

```powershell
git add data-service/app/providers/base.py data-service/app/providers/yahoo_provider.py data-service/app/providers/finnhub_provider.py data-service/app/providers/market_data_resolver.py data-service/tests/test_market_data_resolver_metrics.py data-service/tests/test_ohlcv_adjustment.py
git diff --cached --check
git commit -m "feat(data-service): add adjusted flag to OHLCV provider chain"
```

---

## Task 3: Tiingo Adjusted Fields and Daily-Only Guard

**Files:**
- Modify: `data-service/app/providers/tiingo_provider.py:68-134` (`get_ohlcv`)
- Modify: `docs/spec/current-system/operations.md` (Provider Responsibilities, Tiingo row)
- Test: `data-service/tests/test_tiingo_provider.py`

**Interfaces:**
- Consumes: Task 2 signature.
- Produces: `TiingoProvider.get_ohlcv(symbol, interval="1d", period="1y", adjusted=False)` — `[]` without HTTP for `interval != "1d"`; raw fields when unadjusted; `adj*` fields when adjusted.
- Preserves: `_period_to_dates`, auth headers, HTTP error handling, other Tiingo methods.

**Acceptance Evidence:**
- `pytest tests/test_tiingo_provider.py -v`: 6 passed.

- [ ] **Step 1: Write the failing tests**

```python
"""TiingoProvider OHLCV field selection and interval guard (no live HTTP)."""

from __future__ import annotations

from types import SimpleNamespace

import httpx
import pytest

from app.providers import tiingo_provider
from app.providers.tiingo_provider import TiingoProvider

ROW = {
    "date": "2026-01-02T00:00:00.000Z",
    "open": 100.0, "high": 110.0, "low": 90.0, "close": 105.0, "volume": 1000,
    "adjOpen": 50.0, "adjHigh": 55.0, "adjLow": 45.0, "adjClose": 52.5, "adjVolume": 2000.0,
}


class FakeResponse:
    def __init__(self, payload: list[dict]) -> None:
        self._payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> list[dict]:
        return self._payload


class FakeClient:
    payload: list[dict] = []
    created = 0

    def __init__(self, timeout: float) -> None:
        FakeClient.created += 1

    def __enter__(self) -> "FakeClient":
        return self

    def __exit__(self, *exc) -> bool:
        return False

    def get(self, url: str, headers: dict, params: dict) -> FakeResponse:
        return FakeResponse(FakeClient.payload)


@pytest.fixture
def fake_http(monkeypatch):
    FakeClient.payload = [dict(ROW)]
    FakeClient.created = 0
    monkeypatch.setattr(
        tiingo_provider, "httpx", SimpleNamespace(Client=FakeClient, HTTPStatusError=httpx.HTTPStatusError)
    )
    return FakeClient


def test_unadjusted_bars_use_raw_fields(fake_http):
    [bar] = TiingoProvider("test-tiingo-key").get_ohlcv("AAPL", "1d", "1mo")

    assert (bar.open, bar.high, bar.low, bar.close, bar.volume) == (100.0, 110.0, 90.0, 105.0, 1000)


def test_adjusted_bars_use_adj_fields(fake_http):
    [bar] = TiingoProvider("test-tiingo-key").get_ohlcv("AAPL", "1d", "1mo", adjusted=True)

    assert (bar.open, bar.high, bar.low, bar.close, bar.volume) == (50.0, 55.0, 45.0, 52.5, 2000)


def test_unadjusted_request_never_substitutes_adjusted_close(fake_http):
    row = dict(ROW)
    del row["close"]
    fake_http.payload = [row]

    assert TiingoProvider("test-tiingo-key").get_ohlcv("AAPL", "1d", "1mo") == []


@pytest.mark.parametrize("interval", ["1h", "5m", "1wk"])
def test_non_daily_interval_returns_empty_without_http_call(fake_http, interval):
    assert TiingoProvider("test-tiingo-key").get_ohlcv("AAPL", interval, "1mo") == []
    assert fake_http.created == 0
```

- [ ] **Step 2: Run them and confirm failure**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_tiingo_provider.py -v`

Expected: `test_unadjusted_bars_use_raw_fields` passes (current behavior); the other 5 FAIL — adjusted fields ignored, `adjClose` substituted, intraday served.

- [ ] **Step 3: Implement in `tiingo_provider.py`**

Add module constants after `_TIINGO_EOD_PATH`:

```python
_RAW_FIELDS = ("open", "high", "low", "close", "volume")
_ADJUSTED_FIELDS = ("adjOpen", "adjHigh", "adjLow", "adjClose", "adjVolume")
```

Replace `get_ohlcv`'s signature, docstring, and row mapping:

```python
    def get_ohlcv(
        self,
        symbol: str,
        interval: str = "1d",
        period: str = "1y",
        adjusted: bool = False,
    ) -> list[OHLCVBar]:
        """
        Fetch EOD OHLCV bars from Tiingo.

        Tiingo EOD is daily only, so any other interval returns an empty list and
        the resolver falls through instead of serving daily bars (ADR-0006 D6).
        ``adjusted`` selects Tiingo's split/dividend-adjusted ``adj*`` fields.
        """
        if interval != "1d":
            logger.info(
                "TiingoProvider: interval=%s unsupported (daily only) symbol=%s", interval, symbol
            )
            return []

        open_key, high_key, low_key, close_key, volume_key = _ADJUSTED_FIELDS if adjusted else _RAW_FIELDS
        # … existing date window, URL, params, and HTTP block unchanged …
```

Inside the row loop, replace the bar construction with:

```python
                close = row.get(close_key)
                if close is None:
                    continue

                bars.append(
                    OHLCVBar(
                        timestamp=dt.astimezone(timezone.utc),
                        open=float(row.get(open_key) or close),
                        high=float(row.get(high_key) or close),
                        low=float(row.get(low_key) or close),
                        close=float(close),
                        volume=int(row[volume_key]) if row.get(volume_key) is not None else None,
                    )
                )
```

- [ ] **Step 4: Run focused and full checks**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_tiingo_provider.py -v` — Expected: 6 passed.

Run: `.\.venv\Scripts\python.exe -m pytest -q` — Expected: green, 1 xfailed.

- [ ] **Step 5: Update the Tiingo row in `operations.md`**

```markdown
| Tiingo | Optional daily-only EOD OHLCV/news fallback when configured; non-daily intervals return empty so the resolver never serves daily bars as intraday; `adjusted` requests use Tiingo `adj*` fields |
```

- [ ] **Step 6: Commit**

```powershell
git add data-service/app/providers/tiingo_provider.py data-service/tests/test_tiingo_provider.py docs/spec/current-system/operations.md
git diff --cached --check
git commit -m "fix(data-service): keep Tiingo bars daily and adjustment-consistent"
```

---

## Task 4: Price-History Helpers

**Files:**
- Create: `data-service/app/services/price_history.py`
- Test: `data-service/tests/test_price_history.py`

**Interfaces:**
- Consumes: `OHLCVBar`; any object with `get_ohlcv(symbol, interval, period, adjusted=...)` (resolver or `ScriptedProvider`).
- Produces:
  - `OHLCV_COLUMNS = ["Open", "High", "Low", "Close", "Volume"]`
  - `DAILY_OR_LONGER_INTERVALS = frozenset({"1d", "5d", "1wk", "1mo", "3mo"})`
  - `bars_to_frame(bars: Iterable[OHLCVBar]) -> pd.DataFrame` — float columns `OHLCV_COLUMNS`, tz-aware UTC `DatetimeIndex`, ascending; `None` volume → `NaN`.
  - `to_trading_dates(frame: pd.DataFrame) -> pd.DataFrame` — tz-naive session-date index named `Date`, duplicates keep last.
  - `covering_period(lookback_days: int) -> str` — `ValueError` below 1.
  - `fetch_daily_frame(source, symbol: str, *, lookback_days: int, adjusted: bool, include_today: bool, today: date | None = None) -> pd.DataFrame`
  - `fetch_close_matrix(source, symbols: Sequence[str], *, lookback_days: int, adjusted: bool, today: date | None = None) -> pd.DataFrame` — one column per symbol in input order, index `Date`, end-exclusive window, missing symbol → all-`NaN` column.
- Preserves: nothing calls these yet.

**Acceptance Evidence:**
- `pytest tests/test_price_history.py -v`: 20 passed.

- [ ] **Step 1: Write the failing tests**

```python
"""Price-history helpers: bars to DataFrames, session dates, and windows."""

from __future__ import annotations

import math
from datetime import date, datetime, timezone

import pandas as pd
import pytest

from app.providers.base import OHLCVBar
from app.services.price_history import (
    OHLCV_COLUMNS,
    bars_to_frame,
    covering_period,
    fetch_close_matrix,
    fetch_daily_frame,
    to_trading_dates,
)

UTC = timezone.utc


def _bar(timestamp: datetime, close: float, volume: int | None = 1) -> OHLCVBar:
    return OHLCVBar(timestamp=timestamp, open=close, high=close, low=close, close=close, volume=volume)


def test_bars_to_frame_builds_sorted_utc_ohlcv_columns():
    frame = bars_to_frame([
        _bar(datetime(2026, 1, 3, 5, tzinfo=UTC), 2.0, volume=None),
        _bar(datetime(2026, 1, 2, 5, tzinfo=UTC), 1.0, volume=500),
    ])

    assert list(frame.columns) == OHLCV_COLUMNS
    assert str(frame.index.tz) == "UTC"
    assert list(frame["Close"]) == [1.0, 2.0]
    assert frame["Volume"].iloc[0] == 500.0
    assert math.isnan(frame["Volume"].iloc[1])


def test_bars_to_frame_empty_keeps_columns():
    frame = bars_to_frame([])

    assert frame.empty
    assert list(frame.columns) == OHLCV_COLUMNS


@pytest.mark.parametrize(
    "utc_timestamp, session_date",
    [
        (datetime(2026, 1, 2, 5, tzinfo=UTC), date(2026, 1, 2)),   # New York midnight, EST
        (datetime(2026, 7, 2, 4, tzinfo=UTC), date(2026, 7, 2)),   # New York midnight, EDT
        (datetime(2026, 1, 1, 15, tzinfo=UTC), date(2026, 1, 2)),  # Tokyo midnight, JST
        (datetime(2026, 1, 1, 23, tzinfo=UTC), date(2026, 1, 2)),  # Frankfurt midnight, CET
        (datetime(2026, 1, 2, 0, tzinfo=UTC), date(2026, 1, 2)),   # Tiingo UTC date
    ],
)
def test_to_trading_dates_recovers_exchange_session_date(utc_timestamp, session_date):
    frame = to_trading_dates(bars_to_frame([_bar(utc_timestamp, 1.0)]))

    assert frame.index[0] == pd.Timestamp(session_date)
    assert frame.index.tz is None
    assert frame.index.name == "Date"


@pytest.mark.parametrize(
    "days, period",
    [(1, "5d"), (5, "5d"), (6, "1mo"), (28, "1mo"), (29, "3mo"), (252, "1y"),
     (365, "1y"), (366, "2y"), (3650, "10y"), (3653, "max")],
)
def test_covering_period(days, period):
    assert covering_period(days) == period


def test_covering_period_rejects_non_positive():
    with pytest.raises(ValueError):
        covering_period(0)


def test_fetch_daily_frame_trims_window_and_requests_covering_period(scripted_provider):
    closes = {date(2026, 3, 4): 4.0, date(2026, 3, 5): 5.0, date(2026, 3, 9): 9.0, date(2026, 3, 10): 10.0}
    provider = scripted_provider(
        "fx-window",
        ohlcv=[_bar(datetime(d.year, d.month, d.day, 5, tzinfo=UTC), c) for d, c in closes.items()],
    )
    today = date(2026, 3, 10)

    inclusive = fetch_daily_frame(provider, "AAPL", lookback_days=5, adjusted=True, include_today=True, today=today)
    exclusive = fetch_daily_frame(provider, "AAPL", lookback_days=5, adjusted=True, include_today=False, today=today)

    assert list(inclusive["Close"]) == [5.0, 9.0, 10.0]
    assert list(exclusive["Close"]) == [5.0, 9.0]
    assert provider.calls_for("ohlcv")[0] == ("ohlcv", ("AAPL", "1d", "5d"), {"adjusted": True})


def test_fetch_close_matrix_aligns_symbols_and_keeps_missing_as_nan(scripted_provider):
    def day(d: int, close: float) -> OHLCVBar:
        return _bar(datetime(2026, 3, d, 5, tzinfo=UTC), close)

    provider = scripted_provider(
        "fx-matrix",
        ohlcv={"AAPL": [day(6, 100.0), day(9, 103.0)], "MSFT": [day(9, 203.0)], "NODATA": []},
    )

    matrix = fetch_close_matrix(
        provider, ["AAPL", "MSFT", "NODATA"], lookback_days=5, adjusted=True, today=date(2026, 3, 10)
    )

    expected = pd.DataFrame(
        {"AAPL": [100.0, 103.0], "MSFT": [float("nan"), 203.0], "NODATA": [float("nan"), float("nan")]},
        index=pd.DatetimeIndex(["2026-03-06", "2026-03-09"], name="Date"),
    )
    pd.testing.assert_frame_equal(matrix, expected, check_index_type=False, check_freq=False)
```

- [ ] **Step 2: Run them and confirm failure**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_price_history.py -v`

Expected: collection error `ModuleNotFoundError: No module named 'app.services.price_history'`.

- [ ] **Step 3: Create `app/services/price_history.py`**

```python
"""Provider-neutral price-history helpers for analytics services (ADR-0006).

Analytics read price history only through ``MarketDataResolver.get_ohlcv`` and
these helpers, which turn bars into the DataFrame shapes the services consume.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Iterable, Protocol, Sequence

import pandas as pd

from app.providers.base import OHLCVBar

OHLCV_COLUMNS = ["Open", "High", "Low", "Close", "Volume"]
DAILY_OR_LONGER_INTERVALS = frozenset({"1d", "5d", "1wk", "1mo", "3mo"})

# Smallest provider period guaranteed to span N calendar days ("1mo" can be 28).
_PERIOD_MIN_DAYS: tuple[tuple[str, int], ...] = (
    ("5d", 5),
    ("1mo", 28),
    ("3mo", 89),
    ("6mo", 181),
    ("1y", 365),
    ("2y", 730),
    ("5y", 1826),
    ("10y", 3652),
)


class OhlcvSource(Protocol):
    def get_ohlcv(
        self, symbol: str, interval: str = "1d", period: str = "1y", adjusted: bool = False
    ) -> list[OHLCVBar]: ...


def bars_to_frame(bars: Iterable[OHLCVBar]) -> pd.DataFrame:
    """OHLCV bars as a float DataFrame indexed by ascending UTC timestamp."""
    rows = list(bars)
    frame = pd.DataFrame(
        {
            "Open": [bar.open for bar in rows],
            "High": [bar.high for bar in rows],
            "Low": [bar.low for bar in rows],
            "Close": [bar.close for bar in rows],
            "Volume": [float("nan") if bar.volume is None else bar.volume for bar in rows],
        },
        index=pd.to_datetime([bar.timestamp for bar in rows], utc=True),
        dtype=float,
    )
    return frame.sort_index()


def to_trading_dates(frame: pd.DataFrame) -> pd.DataFrame:
    """Index daily bars by tz-naive session date, like ``yfinance.download``.

    Daily bars carry exchange-local midnight converted to UTC; rounding to the
    nearest UTC day recovers the session date for exchanges in UTC-11..UTC+11.
    """
    dated = frame.copy()
    dated.index = frame.index.tz_convert("UTC").tz_localize(None).round("D")
    dated.index.name = "Date"
    return dated[~dated.index.duplicated(keep="last")]


def covering_period(lookback_days: int) -> str:
    """Smallest provider period that spans ``lookback_days`` calendar days."""
    if lookback_days < 1:
        raise ValueError("lookback_days must be at least 1")
    for period, min_days in _PERIOD_MIN_DAYS:
        if lookback_days <= min_days:
            return period
    return "max"


def fetch_daily_frame(
    source: OhlcvSource,
    symbol: str,
    *,
    lookback_days: int,
    adjusted: bool,
    include_today: bool,
    today: date | None = None,
) -> pd.DataFrame:
    """Daily OHLCV by session date within ``today - lookback_days`` .. ``today``.

    ``include_today=False`` drops today's session, matching the end-exclusive
    ``yfinance.download(start, end)`` window the portfolio optimizer used.
    """
    session_today = today or datetime.now(timezone.utc).date()
    bars = source.get_ohlcv(symbol, "1d", covering_period(lookback_days), adjusted=adjusted)
    frame = to_trading_dates(bars_to_frame(bars))
    start = pd.Timestamp(session_today - timedelta(days=lookback_days))
    end = pd.Timestamp(session_today)
    upper = frame.index <= end if include_today else frame.index < end
    return frame.loc[(frame.index >= start) & upper]


def fetch_close_matrix(
    source: OhlcvSource,
    symbols: Sequence[str],
    *,
    lookback_days: int,
    adjusted: bool,
    today: date | None = None,
) -> pd.DataFrame:
    """Close prices by session date (rows) and symbol (columns, input order)."""
    closes = {
        symbol: fetch_daily_frame(
            source, symbol, lookback_days=lookback_days, adjusted=adjusted, include_today=False, today=today
        )["Close"]
        for symbol in symbols
    }
    matrix = pd.concat(closes, axis=1).sort_index()
    matrix.index.name = "Date"
    return matrix
```

- [ ] **Step 4: Run focused and full checks**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_price_history.py -v` — Expected: 20 passed.

Run: `.\.venv\Scripts\python.exe -m ruff check app/services/price_history.py` — Expected: `All checks passed!`

Run: `.\.venv\Scripts\python.exe -m pytest -q` — Expected: green, 1 xfailed.

- [ ] **Step 5: Commit**

```powershell
git add data-service/app/services/price_history.py data-service/tests/test_price_history.py
git diff --cached --check
git commit -m "feat(data-service): add resolver price-history frame helpers"
```

---

## Plan Exit Criteria

- [ ] ADR-0006 is `Accepted` with the maintainer's D5 choice recorded.
- [ ] Every produced interface exists with the exact agreed name and signature.
- [ ] Full data-service suite green, 1 xfailed.
- [ ] No analytics service or router changed yet (`git diff main --stat -- data-service/app/routers data-service/app/services` shows only `price_history.py`).
- [ ] Unrelated user changes remain unstaged and unmodified.

## Handoff to Plan 5

- Inputs made available: `adjusted` flag on the chain; `fetch_daily_frame`, `fetch_close_matrix`, `bars_to_frame`, `DAILY_OR_LONGER_INTERVALS`; ADR-0006 D1–D7.
- Conditions Plan 5 may assume: Tiingo never answers non-daily requests; default bars are unadjusted; helpers return the column names and index shapes the services already read.
- Open risks carried forward: D7 rounding is wrong for UTC+12 and later exchanges (owner: maintainer, accepted in ADR); the D5 decision.

## Self-Review

**Spec coverage:** `CAP-CUR-DS-004` decision recorded (Task 1); adjustment semantics (Task 2); wrong-granularity fallback and adjusted/unadjusted mixing (Task 3); frames, session dates, windows, and matrices Plan 5 needs (Task 4). Call-site migration belongs to Plan 5.

**Step scan:** Every code step contains complete code or an exact line-level replacement; Task 1 Step 5 is a deliberate stop.

**Type and name consistency:** `adjusted` keyword name is identical in the protocol, every provider, the resolver, `ScriptedProvider` call records, and the helpers. `fetch_close_matrix` always passes `include_today=False`.

**Review focus:** Each item maps to a named test in Tasks 2–4.

**Proportion:** One decision record and four focused capability changes; no consumer migrated.
