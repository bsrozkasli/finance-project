# Data-Service Boundary Hardening Plan 1 — Resolver Degradation Characterization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pin the documented `MarketDataResolver` degradation contract — registration order, fallback, blacklist, recovery, explicit exhaustion, and wire-level `[]`/health output — with stub-only tests that later plans rely on.

**Architecture:** Test-only slice. A shared `ScriptedProvider` double in `data-service/tests/conftest.py` replaces every external provider. Unit tests exercise the resolver directly; wire tests replace `app.dependencies.get_resolver` and call FastAPI through `TestClient`. No production file changes.

**Tech Stack:** pytest 9, FastAPI `TestClient`, `prometheus_client.REGISTRY`, Python dataclasses from `app.providers.base`.

**Plan Set:** Plan 1 of 6 in `docs/superpowers/plans/2026-10-13-data-service-boundary-hardening.md`.

**Depends On:** Plan-set execution preconditions (merged documentation base, rebuilt `.venv`, green baseline).

**Produces:** `ScriptedProvider` class, `scripted_provider` and `bars` fixtures, and `make_bars()` in `data-service/tests/conftest.py`; `test-results/bugs-found-data-service.jsonl` if any genuine defect is found.

**Spec:** `docs/spec/current-system/operations.md` (Provider Responsibilities, Degradation Contract), `docs/spec/current-system/contracts.md` (Data-Service API), `docs/product/evidence/data-service.md` (`CAP-CUR-DS-002`, `CAP-CUR-DS-003`), `docs/product/CAPABILITY_GAP_MAP.md` row `PRD-FR-010`.

## Locked Decisions

- Expected values come from written contracts, not resolver output: "tries active providers in registration order", "blacklists repeatedly failing providers, and periodically probes recovery", "An empty list or `None` after the chain is valid degradation; it is not replaced with sample data", "`GET /api/v1/prices/{symbol}` … empty list when all providers fail".
- The blacklist threshold (3 consecutive failures) and duration (60 s) come from the module constants `_FAILURE_THRESHOLD` and `_BLACKLIST_DURATION_SECONDS`, which the resolver docstring names as configuration. Tests may monkeypatch them; they must not edit them.
- Counter assertions use before/after deltas from `REGISTRY.get_sample_value`, because the Prometheus registry is process-global.
- Empty responses currently increment the same counter used for the blacklist threshold while `_record_empty` says they "do not blacklist". Intent cannot be established safely, so that test is `xfail(strict=True)` and listed under `AMBIGUOUS_BEHAVIOR`.
- `ScriptedProvider.get_ohlcv` accepts `**kwargs` so Plan 4 can add `adjusted=` without editing the double.

## Global Constraints

- "In test-only tasks, do not change production source; record genuine failures using the bug-reporting contract in `docs/agent/verification.md`." (`AGENTS.md`)
- "Never call live financial providers from automated tests; use boundary stubs." (`AGENTS.md`)
- Edits are limited to `data-service/tests/` and `test-results/` (`docs/agent/verification.md`, Test-Only Task Rules).
- "A genuine production defect discovered by a correct test remains visible: do not loosen assertions, swallow the exception, delete the test, or silently skip it."

## Review Focus

- **Blacklisted provider is still called** — a provider with three consecutive errors must be skipped on the next call. Task 2 `test_three_consecutive_errors_blacklist_provider_and_skip_it`.
- **Recovery never happens** — a blacklisted provider whose probe reports healthy must return to `HEALTHY`. Task 2 `test_blacklisted_provider_recovers_after_healthy_probe`.
- **Exhaustion fabricates data** — every operation must return its documented empty value (`[]`, `None`, empty `FinancialStatements`). Task 2 `test_operation_exhaustion_returns_explicit_empty_value`.
- **Wire layer hides exhaustion** — `/api/v1/prices/{symbol}` must return `200 []`, not an error or sample bars. Task 3 `test_prices_endpoint_returns_empty_list_when_every_provider_fails`.
- **Health endpoint lies after failure** — `/health/providers` must show `degraded`, the failure count, and the last error. Task 3 `test_provider_health_endpoint_reports_degraded_provider`.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `data-service/tests/conftest.py` | Create | Shared provider double and bar factory fixtures |
| `data-service/tests/test_market_data_resolver_fallback.py` | Create | Resolver order, fallback, blacklist, recovery, exhaustion |
| `data-service/tests/test_prices_endpoint.py` | Create | Wire-level `/api/v1/prices` and `/health/providers` degradation |
| `test-results/bugs-found-data-service.jsonl` | Create only if a non-xfail test is red | Bug-reporting contract output |

---

## Task 1: Shared Provider Doubles

**Files:**
- Create: `data-service/tests/conftest.py`

**Interfaces:**
- Consumes: `OHLCVBar`, `FinancialStatements`, `ProviderHealth`, `ProviderStatus` from `app/providers/base.py`.
- Produces:
  - `class ScriptedProvider(name: str, *, ohlcv=None, statements=None, asset_info=None, news=None, recommendations=None, health=None)` with public mutable attributes `ohlcv`, `statements`, `asset_info`, `news`, `recommendations`, `health`; `calls: list[tuple[str, tuple, dict]]`; `calls_for(operation: str) -> list[tuple[str, tuple, dict]]`. A response attribute holding an `Exception` instance is raised. `ohlcv` may be a `dict[str, list[OHLCVBar]]` keyed by upper-case symbol. `get_ohlcv` records `("ohlcv", (symbol, interval, period), kwargs)`.
  - `make_bars(closes: list[float], *, end: datetime | None = None, step: timedelta = timedelta(days=1)) -> list[OHLCVBar]` — O=H=L=C=close, volume 1000, last bar at `end` (default today 05:00 UTC, a New York session midnight).
  - Fixtures `scripted_provider` (returns the class) and `bars` (returns `make_bars`).
- Preserves: root `data-service/conftest.py` (timeout and path handling) is untouched.

**Acceptance Evidence:**
- `pytest --fixtures tests/test_market_data_resolver_metrics.py` lists `scripted_provider` and `bars`.
- Full suite still passes with the baseline count.

- [ ] **Step 1: Confirm the fixtures do not exist yet**

Run (from `data-service/`): `.\.venv\Scripts\python.exe -m pytest --fixtures tests/test_market_data_resolver_metrics.py -q | Select-String scripted_provider`

Expected: no output.

- [ ] **Step 2: Create `data-service/tests/conftest.py`**

```python
"""Shared provider doubles for data-service tests.

The doubles stand in for external market-data providers so no test calls a
live financial API.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import pytest

from app.providers.base import FinancialStatements, OHLCVBar, ProviderHealth, ProviderStatus


class ScriptedProvider:
    """IMarketDataProvider double with per-operation scripted responses.

    Each response attribute holds the value to return or an Exception instance
    to raise. ``ohlcv`` may also be a dict keyed by upper-case symbol. Every
    call is recorded in ``calls`` as ``(operation, args, kwargs)``.
    """

    def __init__(
        self,
        name: str,
        *,
        ohlcv: Any = None,
        statements: Any = None,
        asset_info: Any = None,
        news: Any = None,
        recommendations: Any = None,
        health: Any = None,
    ) -> None:
        self._name = name
        self.ohlcv = [] if ohlcv is None else ohlcv
        self.statements = statements
        self.asset_info = asset_info
        self.news = [] if news is None else news
        self.recommendations = [] if recommendations is None else recommendations
        self.health = health
        self.calls: list[tuple[str, tuple, dict]] = []

    @property
    def provider_name(self) -> str:
        return self._name

    def calls_for(self, operation: str) -> list[tuple[str, tuple, dict]]:
        return [call for call in self.calls if call[0] == operation]

    def _respond(self, operation: str, value: Any, args: tuple, kwargs: dict) -> Any:
        self.calls.append((operation, args, kwargs))
        if isinstance(value, Exception):
            raise value
        return value

    def get_ohlcv(self, symbol: str, interval: str = "1d", period: str = "1y", **kwargs: Any):
        value = self.ohlcv.get(symbol.upper(), []) if isinstance(self.ohlcv, dict) else self.ohlcv
        return self._respond("ohlcv", value, (symbol, interval, period), kwargs)

    def get_financial_statements(self, symbol: str):
        value = FinancialStatements(symbol=symbol.upper()) if self.statements is None else self.statements
        return self._respond("financial_statements", value, (symbol,), {})

    def get_asset_info(self, symbol: str):
        return self._respond("asset_info", self.asset_info, (symbol,), {})

    def get_news(self, symbol: str, from_date: str, to_date: str):
        return self._respond("news", self.news, (symbol, from_date, to_date), {})

    def get_analyst_recommendations(self, symbol: str):
        return self._respond("analyst_recommendations", self.recommendations, (symbol,), {})

    def health_check(self):
        value = ProviderHealth(self._name, ProviderStatus.HEALTHY) if self.health is None else self.health
        return self._respond("health_check", value, (), {})


def make_bars(
    closes: list[float],
    *,
    end: datetime | None = None,
    step: timedelta = timedelta(days=1),
) -> list[OHLCVBar]:
    """Bars with O=H=L=C=close; the last bar sits at ``end`` (default today 05:00 UTC)."""
    if end is None:
        today = datetime.now(timezone.utc).date()
        end = datetime(today.year, today.month, today.day, 5, tzinfo=timezone.utc)
    start = end - step * (len(closes) - 1)
    return [
        OHLCVBar(timestamp=start + step * index, open=close, high=close, low=close, close=close, volume=1000)
        for index, close in enumerate(closes)
    ]


@pytest.fixture
def scripted_provider() -> type[ScriptedProvider]:
    return ScriptedProvider


@pytest.fixture
def bars():
    return make_bars
```

- [ ] **Step 3: Confirm fixtures are discovered and the suite is unchanged**

Run: `.\.venv\Scripts\python.exe -m pytest --fixtures tests/test_market_data_resolver_metrics.py -q | Select-String "scripted_provider|bars"`

Expected: both fixture names printed.

Run: `.\.venv\Scripts\python.exe -m pytest -q`

Expected: same pass count as the precondition baseline.

- [ ] **Step 4: Commit**

```powershell
git add data-service/tests/conftest.py
git diff --cached --check
git commit -m "test(data-service): add scripted provider doubles"
```

---

## Task 2: Resolver Fallback, Blacklist, Recovery, and Exhaustion

**Files:**
- Create: `data-service/tests/test_market_data_resolver_fallback.py`

**Interfaces:**
- Consumes: `scripted_provider`, `bars` fixtures (Task 1); `MarketDataResolver`, module constants `_BLACKLIST_DURATION_SECONDS`, `_HEALTH_CHECK_INTERVAL_SECONDS`.
- Produces: characterization of current resolver behavior that Plans 2, 4, and 5 must keep green.
- Preserves: `app/providers/market_data_resolver.py` unchanged.

**Acceptance Evidence:**
- `pytest tests/test_market_data_resolver_fallback.py -v` shows every test passing except one `XFAIL` for the ambiguous empty-count case.
- Any other red test is recorded in `test-results/bugs-found-data-service.jsonl`, not "fixed".

- [ ] **Step 1: Write the test file**

```python
"""Characterization of the MarketDataResolver degradation contract.

Expected behavior comes from docs/spec/current-system/operations.md and the
resolver module docstring, not from observed output.
"""

from __future__ import annotations

import time
from datetime import datetime, timezone

import pytest
from prometheus_client import REGISTRY

from app.providers import market_data_resolver as resolver_module
from app.providers.base import (
    AnalystRecommendation,
    AssetInfo,
    FinancialStatements,
    NewsItem,
    ProviderStatus,
)
from app.providers.market_data_resolver import MarketDataResolver

SYMBOL = "AAPL"


def _sample(name: str, **labels: str) -> float:
    return REGISTRY.get_sample_value(name, labels) or 0.0


def test_ohlcv_uses_registration_order_and_stops_at_first_usable_provider(scripted_provider, bars):
    first = scripted_provider("fx-order-first", ohlcv=[])
    second = scripted_provider("fx-order-second", ohlcv=bars([10.0, 11.0]))
    third = scripted_provider("fx-order-third", ohlcv=bars([99.0, 99.0]))

    result = MarketDataResolver([first, second, third]).get_ohlcv(SYMBOL, "1d", "1mo")

    assert [bar.close for bar in result] == [10.0, 11.0]
    assert len(first.calls_for("ohlcv")) == 1
    assert len(second.calls_for("ohlcv")) == 1
    assert third.calls_for("ohlcv") == []


def test_ohlcv_falls_back_after_provider_error_and_marks_it_degraded(scripted_provider, bars):
    failing = scripted_provider("fx-error-first", ohlcv=RuntimeError("upstream timeout"))
    healthy = scripted_provider("fx-error-second", ohlcv=bars([20.0]))
    resolver = MarketDataResolver([failing, healthy])

    result = resolver.get_ohlcv(SYMBOL)

    assert [bar.close for bar in result] == [20.0]
    health = resolver.get_provider_health("fx-error-first")
    assert health.status is ProviderStatus.DEGRADED
    assert health.consecutive_failures == 1
    assert health.last_error == "upstream timeout"


def test_ohlcv_exhaustion_returns_empty_list_without_synthetic_bars(scripted_provider):
    resolver = MarketDataResolver([
        scripted_provider("fx-exhaust-empty", ohlcv=[]),
        scripted_provider("fx-exhaust-error", ohlcv=RuntimeError("down")),
    ])

    assert resolver.get_ohlcv(SYMBOL) == []


def test_empty_and_fallback_metrics_count_each_transition_once(scripted_provider):
    fallback = dict(operation="ohlcv", from_provider="fx-metric-a", to_provider="fx-metric-b")
    empty_b = dict(provider="fx-metric-b", operation="ohlcv")
    fallback_before = _sample("market_provider_fallback_total", **fallback)
    empty_before = _sample("market_provider_empty_total", **empty_b)

    MarketDataResolver([
        scripted_provider("fx-metric-a", ohlcv=[]),
        scripted_provider("fx-metric-b", ohlcv=[]),
    ]).get_ohlcv(SYMBOL)

    assert _sample("market_provider_fallback_total", **fallback) - fallback_before == 1.0
    assert _sample("market_provider_empty_total", **empty_b) - empty_before == 1.0


def test_three_consecutive_errors_blacklist_provider_and_skip_it(scripted_provider, bars):
    failing = scripted_provider("fx-blacklist-failing", ohlcv=RuntimeError("503"))
    backup = scripted_provider("fx-blacklist-backup", ohlcv=bars([30.0]))
    resolver = MarketDataResolver([failing, backup])

    for _ in range(3):
        assert [bar.close for bar in resolver.get_ohlcv(SYMBOL)] == [30.0]
    assert resolver.get_provider_health("fx-blacklist-failing").status is ProviderStatus.BLACKLISTED

    resolver.get_ohlcv(SYMBOL)

    assert len(failing.calls_for("ohlcv")) == 3
    assert len(backup.calls_for("ohlcv")) == 4


def test_success_resets_consecutive_failures(scripted_provider, bars):
    flaky = scripted_provider("fx-reset-flaky", ohlcv=RuntimeError("blip"))
    resolver = MarketDataResolver([flaky])
    resolver.get_ohlcv(SYMBOL)
    resolver.get_ohlcv(SYMBOL)

    flaky.ohlcv = bars([40.0])
    assert [bar.close for bar in resolver.get_ohlcv(SYMBOL)] == [40.0]

    flaky.ohlcv = RuntimeError("blip")
    resolver.get_ohlcv(SYMBOL)
    health = resolver.get_provider_health("fx-reset-flaky")
    assert health.status is ProviderStatus.DEGRADED
    assert health.consecutive_failures == 1


@pytest.mark.xfail(
    strict=True,
    reason=(
        "AMBIGUOUS_BEHAVIOR: _record_empty documents empty responses as soft failures that "
        "do not blacklist, but it increments the counter _record_failure compares with "
        "_FAILURE_THRESHOLD, so two empties plus one error blacklist the provider."
    ),
)
def test_empty_responses_do_not_count_toward_blacklist_threshold(scripted_provider):
    provider = scripted_provider("fx-ambiguous-empty", ohlcv=[])
    resolver = MarketDataResolver([provider])
    resolver.get_ohlcv(SYMBOL)
    resolver.get_ohlcv(SYMBOL)

    provider.ohlcv = RuntimeError("single error")
    resolver.get_ohlcv(SYMBOL)

    assert resolver.get_provider_health("fx-ambiguous-empty").status is ProviderStatus.DEGRADED


def test_blacklisted_provider_recovers_after_healthy_probe(scripted_provider, monkeypatch):
    monkeypatch.setattr(resolver_module, "_BLACKLIST_DURATION_SECONDS", 0)
    monkeypatch.setattr(resolver_module, "_HEALTH_CHECK_INTERVAL_SECONDS", 0.01)
    provider = scripted_provider("fx-recovery", ohlcv=RuntimeError("outage"))
    resolver = MarketDataResolver([provider])
    for _ in range(3):
        resolver.get_ohlcv(SYMBOL)

    deadline = time.monotonic() + 2.0
    while time.monotonic() < deadline:
        if resolver.get_provider_health("fx-recovery").status is ProviderStatus.HEALTHY:
            break
        time.sleep(0.01)

    assert resolver.get_provider_health("fx-recovery").status is ProviderStatus.HEALTHY
    assert provider.calls_for("health_check")


_NEWS = NewsItem(
    headline="Earnings beat",
    summary="",
    source="stub",
    url="https://example.invalid/news",
    published_at=datetime(2026, 1, 2, tzinfo=timezone.utc),
)

OPERATION_CASES = [
    pytest.param(
        "get_financial_statements", (SYMBOL,), "statements",
        FinancialStatements(symbol=SYMBOL),
        FinancialStatements(symbol=SYMBOL, revenue=[100.0]),
        FinancialStatements(symbol=SYMBOL),
        id="financial_statements",
    ),
    pytest.param(
        "get_asset_info", (SYMBOL,), "asset_info",
        None, AssetInfo(symbol=SYMBOL, name="Apple Inc."), None,
        id="asset_info",
    ),
    pytest.param(
        "get_news", (SYMBOL, "2026-01-01", "2026-01-02"), "news",
        [], [_NEWS], [],
        id="news",
    ),
    pytest.param(
        "get_analyst_recommendations", (SYMBOL,), "recommendations",
        [], [AnalystRecommendation(period="2026-01-01", buy=3)], [],
        id="analyst_recommendations",
    ),
]


@pytest.mark.parametrize("method, args, attribute, empty_value, usable_value, exhausted_value", OPERATION_CASES)
def test_operation_falls_back_past_empty_and_error(
    scripted_provider, method, args, attribute, empty_value, usable_value, exhausted_value
):
    resolver = MarketDataResolver([
        scripted_provider(f"fx-{method}-empty", **{attribute: empty_value}),
        scripted_provider(f"fx-{method}-error", **{attribute: RuntimeError("down")}),
        scripted_provider(f"fx-{method}-usable", **{attribute: usable_value}),
    ])

    assert getattr(resolver, method)(*args) == usable_value


@pytest.mark.parametrize("method, args, attribute, empty_value, usable_value, exhausted_value", OPERATION_CASES)
def test_operation_exhaustion_returns_explicit_empty_value(
    scripted_provider, method, args, attribute, empty_value, usable_value, exhausted_value
):
    resolver = MarketDataResolver([
        scripted_provider(f"fx-{method}-x-empty", **{attribute: empty_value}),
        scripted_provider(f"fx-{method}-x-error", **{attribute: RuntimeError("down")}),
    ])

    assert getattr(resolver, method)(*args) == exhausted_value
```

- [ ] **Step 2: Run the file**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_market_data_resolver_fallback.py -v`

Expected: all tests `PASSED` except `test_empty_responses_do_not_count_toward_blacklist_threshold` `XFAIL`. These are characterization tests of existing behavior, so there is no prior red state to observe.

- [ ] **Step 3: Classify any unexpected red test**

For each failing test other than the xfail: if the test contradicts the written contract, fix the test and note the independent source. If production contradicts the contract, append one line to `test-results/bugs-found-data-service.jsonl`:

```json
{"test_name":"tests/test_market_data_resolver_fallback.py::<name>","source_file":"data-service/app/providers/market_data_resolver.py","source_line":<line>,"expected":"<contract>","actual":"<observed>","hypothesis":"<cause>","severity":"medium"}
```

Leave the test red, report it, and stop the plan for maintainer direction.

- [ ] **Step 4: Run the full suite**

Run: `.\.venv\Scripts\python.exe -m pytest -q`

Expected: baseline count + new tests passed, 1 xfailed.

- [ ] **Step 5: Commit**

```powershell
git add data-service/tests/test_market_data_resolver_fallback.py
git diff --cached --check
git commit -m "test(data-service): characterize resolver fallback and blacklist"
```

---

## Task 3: Wire-Level Price and Health Degradation

**Files:**
- Create: `data-service/tests/test_prices_endpoint.py`

**Interfaces:**
- Consumes: `scripted_provider` fixture; `app.dependencies.get_resolver` (looked up at call time by `main.get_prices` and `app.routers.health._get_resolver`).
- Produces: wire-level proof for the data-service half of `PRD-FR-010`.
- Preserves: `GET /api/v1/prices/{symbol}` response shape `[{timestamp, open, high, low, close, volume}]`; `/health/providers` row shape.

**Acceptance Evidence:**
- `pytest tests/test_prices_endpoint.py -v` passes three tests.

- [ ] **Step 1: Write the test file**

```python
"""Wire-level degradation of the provider-chain price and health routes."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app import dependencies
from app.providers.base import OHLCVBar
from app.providers.market_data_resolver import MarketDataResolver
from main import app


def _install(monkeypatch, resolver: MarketDataResolver) -> TestClient:
    monkeypatch.setattr(dependencies, "get_resolver", lambda: resolver)
    return TestClient(app)


def test_prices_endpoint_returns_empty_list_when_every_provider_fails(monkeypatch, scripted_provider):
    client = _install(monkeypatch, MarketDataResolver([
        scripted_provider("fx-wire-empty", ohlcv=[]),
        scripted_provider("fx-wire-error", ohlcv=RuntimeError("down")),
    ]))

    response = client.get("/api/v1/prices/AAPL?interval=1d&range=1mo")

    assert response.status_code == 200
    assert response.json() == []


def test_prices_endpoint_serializes_fallback_bars_in_utc(monkeypatch, scripted_provider):
    bar = OHLCVBar(
        timestamp=datetime(2026, 1, 2, 5, tzinfo=timezone.utc),
        open=10.0, high=12.0, low=9.0, close=11.0, volume=1000,
    )
    client = _install(monkeypatch, MarketDataResolver([
        scripted_provider("fx-wire-first", ohlcv=[]),
        scripted_provider("fx-wire-second", ohlcv=[bar]),
    ]))

    response = client.get("/api/v1/prices/AAPL")

    assert response.status_code == 200
    assert response.json() == [{
        "timestamp": "2026-01-02T05:00:00Z",
        "open": 10.0, "high": 12.0, "low": 9.0, "close": 11.0, "volume": 1000,
    }]


def test_provider_health_endpoint_reports_degraded_provider(monkeypatch, scripted_provider):
    resolver = MarketDataResolver([
        scripted_provider("fx-wire-degraded", ohlcv=RuntimeError("upstream 502")),
        scripted_provider("fx-wire-ok", ohlcv=[]),
    ])
    resolver.get_ohlcv("AAPL")
    client = _install(monkeypatch, resolver)

    rows = {row["provider"]: row for row in client.get("/health/providers").json()}

    assert rows["fx-wire-degraded"]["status"] == "degraded"
    assert rows["fx-wire-degraded"]["consecutive_failures"] == 1
    assert rows["fx-wire-degraded"]["last_error"] == "upstream 502"
    assert rows["fx-wire-ok"]["status"] == "healthy"
```

- [ ] **Step 2: Run the file**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_prices_endpoint.py -v`

Expected: 3 passed. Classify any red test with Task 2 Step 3.

- [ ] **Step 3: Run the full suite**

Run: `.\.venv\Scripts\python.exe -m pytest -q`

Expected: all green, 1 xfailed.

- [ ] **Step 4: Commit**

```powershell
git add data-service/tests/test_prices_endpoint.py
git diff --cached --check
git commit -m "test(data-service): pin price and health route degradation"
```

---

## Plan Exit Criteria

- [ ] Every task has its own focused verification evidence.
- [ ] `ScriptedProvider`, `make_bars`, `scripted_provider`, and `bars` exist with the exact agreed names.
- [ ] `git diff main --stat -- data-service/app data-service/main.py` is empty (test-only plan).
- [ ] Full data-service suite green with exactly 1 xfail.
- [ ] Unrelated user changes remain unstaged and unmodified.

## Handoff to Plans 2, 3, and 4

- Inputs made available: `data-service/tests/conftest.py` doubles; two characterization test files.
- Conditions the next plans may assume: resolver order, fallback, blacklist, recovery, and exhaustion behave as documented; `/api/v1/prices` returns `200 []` on exhaustion.
- Open risks carried forward:
  - `AMBIGUOUS_BEHAVIOR`: empty responses count toward the blacklist threshold. Owner: maintainer; resolve before any resolver threshold change.
  - Any line in `test-results/bugs-found-data-service.jsonl`. Owner: maintainer; blocks Plan 4.

## Self-Review

**Spec coverage:** Registration order, fallback after empty and error, blacklist, recovery probe, explicit exhaustion for all five operations, Prometheus fallback/empty counters, `/api/v1/prices` exhaustion and serialization, `/health/providers` degraded state. Cross-runtime fixtures stay with `EPIC-001`.

**Step scan:** Each step is one command or one file; no placeholder remains except the bug-record template fields filled from an observed failure.

**Type and name consistency:** `ScriptedProvider` attributes (`ohlcv`, `statements`, `asset_info`, `news`, `recommendations`) match the `attribute` column in `OPERATION_CASES`; `calls_for("ohlcv")` matches `_respond("ohlcv", …)`.

**Review focus:** All five items map to named tests in Tasks 2–3.

**Proportion:** The plan records tests and decisions; it changes no production code.
