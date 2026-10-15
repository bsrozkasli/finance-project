# Data-Service Boundary Hardening Plan 3 — Cache Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Export Prometheus counters that show, for the macro and calendar caches, whether each lookup was served from memory, from Redis, or missed, and how often Redis reads or writes fail.

**Architecture:** Two counters join the existing HTTP metrics in `app/observability.py`. `MarketCalendarService` increments them at its three lookup outcomes and in its Redis read/write `except` blocks. Cache behavior (TTLs, keys, fallback order) is unchanged.

**Tech Stack:** `prometheus_client.Counter`, pytest with an in-test `FakeRedis`.

**Plan Set:** Plan 3 of 6 in `docs/superpowers/plans/2026-10-13-data-service-boundary-hardening.md`.

**Depends On:** Plan 1.

**Produces:** Metrics `data_service_cache_lookups_total{cache, result}` and `data_service_cache_errors_total{cache, operation}`; corrected Observability section in `operations.md`.

**Spec:** `docs/spec/current-system/operations.md` (Data-service caches; Observability: "Cache-hit visibility is incomplete and remains an observability gap"); `docs/product/evidence/data-service.md` `CAP-CUR-DS-008`.

## Locked Decisions

- `cache` label values: `macro`, `calendar`. `result` values: `memory_hit`, `redis_hit`, `miss`. `operation` values: `read`, `write`. Labels stay bounded; symbols are never labels.
- A miss is counted once per provider fetch, after both memory and Redis failed to serve. A Redis read error also counts as a miss when the provider is then called.
- Redis being absent (`RedisClient is None`) is configuration, not an error, and is not counted in `data_service_cache_errors_total`.
- `_read_cache`/`_write_cache` gain a leading `cache: str` parameter; they are private and have no other callers.
- `prometheus.yml` already scrapes `data-service:8000/metrics` (job `python-data-service`); `operations.md` currently says Prometheus scrapes only the backend. This plan corrects that sentence. `prometheus.yml` itself is not touched.

## Global Constraints

- "Cache absence never authorizes synthetic provider output." (`operations.md`)
- "Do not change `docker-compose.yml` bindings or `prometheus.yml` scrape targets incidentally." (`operations.md`)
- Never call live providers or Redis from tests; FRED/FMP are monkeypatched, Redis is a fake.
- Preserve unrelated working-tree changes.

## Review Focus

- **Redis outage hides data** — with Redis raising on `get`/`set`, the provider result must still be returned and both errors counted. Task 1 `test_redis_failures_are_counted_and_do_not_hide_provider_result`.
- **Restart path miscounted** — after `clear_cache()` with Redis populated, the lookup must count `redis_hit`, not `miss`. Task 1 `test_macro_lookups_report_miss_memory_hit_and_redis_hit`.
- **Calendar double-counted** — `economic_events()` then `earnings()` share one daily fetch: exactly one `miss` and one `memory_hit`. Task 1 `test_calendar_lookups_report_miss_then_memory_hit`.
- **Provider called on hit** — a hit must not call FRED again. Task 1 asserts `macro_provider["count"] == 1`.
- **Existing cache tests regress** — `tests/test_market_calendar_providers.py` must stay green after the signature change. Task 1 Step 5.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `data-service/app/observability.py` | Modify | Declare cache counters |
| `data-service/app/services/market_calendar_service.py` | Modify | Increment counters at lookup outcomes and Redis failures |
| `data-service/tests/test_market_calendar_cache_metrics.py` | Create | Counter behavior |
| `docs/spec/current-system/operations.md` | Modify | Observability section |

---

## Task 1: Count Cache Lookups and Redis Failures

**Files:**
- Modify: `data-service/app/observability.py` (append after `HTTP_REQUEST_DURATION_SECONDS`)
- Modify: `data-service/app/services/market_calendar_service.py` (`macro_snapshot`, `_ensure_daily_calendar`, `_read_cache`, `_write_cache`)
- Modify: `docs/spec/current-system/operations.md` (Observability bullets)
- Test: `data-service/tests/test_market_calendar_cache_metrics.py`

**Interfaces:**
- Consumes: `MarketCalendarService` class attributes `_redis_client`, `clear_cache()`; `FredProvider.get_macro_snapshot`; `FmpProvider.get_earnings_calendar`/`get_economic_events`.
- Produces: `CACHE_LOOKUPS_TOTAL` and `CACHE_ERRORS_TOTAL` in `app.observability`; `_read_cache(cls, cache: str, key: str, model: type[T]) -> T | None`; `_write_cache(cls, cache: str, key: str, value: BaseModel, ttl_seconds: int) -> None`.
- Preserves: `MACRO_CACHE_TTL_SECONDS`, cache keys, next-UTC-midnight calendar expiry, all public method signatures.

**Acceptance Evidence:**
- New test file: 3 passed. `tests/test_market_calendar_providers.py`: unchanged pass count.
- `GET /metrics` exposes `data_service_cache_lookups_total` after one macro call.

- [ ] **Step 1: Write the failing tests**

```python
"""Prometheus counters for the macro and calendar caches."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone

import pytest
from prometheus_client import REGISTRY

from app.models.market_calendar import MacroSnapshot
from app.providers.fmp_provider import FmpProvider
from app.providers.fred_provider import FredProvider
from app.services.market_calendar_service import MarketCalendarService


class FakeRedis:
    def __init__(self) -> None:
        self.store: dict[str, str] = {}

    async def get(self, key: str) -> str | None:
        return self.store.get(key)

    async def set(self, key: str, value: str, ex: int) -> None:
        self.store[key] = value


class FailingRedis:
    async def get(self, key: str) -> str | None:
        raise ConnectionError("redis down")

    async def set(self, key: str, value: str, ex: int) -> None:
        raise ConnectionError("redis down")


def _lookups(cache: str, result: str) -> float:
    return REGISTRY.get_sample_value("data_service_cache_lookups_total", {"cache": cache, "result": result}) or 0.0


def _errors(cache: str, operation: str) -> float:
    return REGISTRY.get_sample_value("data_service_cache_errors_total", {"cache": cache, "operation": operation}) or 0.0


@pytest.fixture(autouse=True)
def isolated_cache():
    MarketCalendarService.clear_cache()
    MarketCalendarService._redis_client = None
    yield
    MarketCalendarService.clear_cache()
    MarketCalendarService._redis_client = None


@pytest.fixture
def macro_provider(monkeypatch):
    calls = {"count": 0}

    async def fake_macro_snapshot(self):
        calls["count"] += 1
        return MacroSnapshot(fed_funds_rate=5.33, cached_at=datetime(2026, 6, 30, tzinfo=timezone.utc))

    monkeypatch.setattr(FredProvider, "get_macro_snapshot", fake_macro_snapshot)
    return calls


def test_macro_lookups_report_miss_memory_hit_and_redis_hit(macro_provider):
    MarketCalendarService._redis_client = FakeRedis()
    results = ("miss", "memory_hit", "redis_hit")
    before = {result: _lookups("macro", result) for result in results}

    asyncio.run(MarketCalendarService.macro_snapshot())
    asyncio.run(MarketCalendarService.macro_snapshot())
    MarketCalendarService.clear_cache()
    asyncio.run(MarketCalendarService.macro_snapshot())

    assert {result: _lookups("macro", result) - before[result] for result in results} == {
        "miss": 1.0,
        "memory_hit": 1.0,
        "redis_hit": 1.0,
    }
    assert macro_provider["count"] == 1


def test_calendar_lookups_report_miss_then_memory_hit(monkeypatch):
    monkeypatch.setattr(FmpProvider, "get_earnings_calendar", lambda self, *args, **kwargs: [])
    monkeypatch.setattr(FmpProvider, "get_economic_events", lambda self, *args, **kwargs: [])
    MarketCalendarService._redis_client = FakeRedis()
    results = ("miss", "memory_hit")
    before = {result: _lookups("calendar", result) for result in results}

    asyncio.run(MarketCalendarService.economic_events())
    asyncio.run(MarketCalendarService.earnings(["AAPL"]))

    assert {result: _lookups("calendar", result) - before[result] for result in results} == {
        "miss": 1.0,
        "memory_hit": 1.0,
    }


def test_redis_failures_are_counted_and_do_not_hide_provider_result(macro_provider):
    MarketCalendarService._redis_client = FailingRedis()
    read_before, write_before = _errors("macro", "read"), _errors("macro", "write")
    miss_before = _lookups("macro", "miss")

    snapshot = asyncio.run(MarketCalendarService.macro_snapshot())

    assert snapshot.fed_funds_rate == 5.33
    assert _errors("macro", "read") - read_before == 1.0
    assert _errors("macro", "write") - write_before == 1.0
    assert _lookups("macro", "miss") - miss_before == 1.0
```

- [ ] **Step 2: Run them and confirm failure**

Run (from `data-service/`): `.\.venv\Scripts\python.exe -m pytest tests/test_market_calendar_cache_metrics.py -v`

Expected: 3 FAIL — the counters do not exist, so every delta is `0.0`.

- [ ] **Step 3: Declare the counters in `app/observability.py`** (after `HTTP_REQUEST_DURATION_SECONDS`)

```python
CACHE_LOOKUPS_TOTAL = Counter(
    "data_service_cache_lookups_total",
    "Data-service cache lookups by cache and result (memory_hit, redis_hit, miss)",
    ["cache", "result"],
)
CACHE_ERRORS_TOTAL = Counter(
    "data_service_cache_errors_total",
    "Data-service cache backend failures by cache and operation (read, write)",
    ["cache", "operation"],
)
```

- [ ] **Step 4: Instrument `MarketCalendarService`**

Add imports and label constants:

```python
from app.observability import CACHE_ERRORS_TOTAL, CACHE_LOOKUPS_TOTAL

_MACRO_CACHE = "macro"
_CALENDAR_CACHE = "calendar"
```

Replace `macro_snapshot`:

```python
    @classmethod
    async def macro_snapshot(cls) -> MacroSnapshot:
        now = datetime.now(timezone.utc)
        if cls._macro_snapshot is not None and cls._macro_expires_at is not None and now < cls._macro_expires_at:
            CACHE_LOOKUPS_TOTAL.labels(cache=_MACRO_CACHE, result="memory_hit").inc()
            return cls._macro_snapshot

        cached = await cls._read_cache(_MACRO_CACHE, _MACRO_CACHE_KEY, MacroSnapshot)
        if cached is not None:
            CACHE_LOOKUPS_TOTAL.labels(cache=_MACRO_CACHE, result="redis_hit").inc()
            cls._macro_snapshot = cached
            cls._macro_expires_at = now + timedelta(seconds=MACRO_CACHE_TTL_SECONDS)
            return cached

        CACHE_LOOKUPS_TOTAL.labels(cache=_MACRO_CACHE, result="miss").inc()
        snapshot = await FredProvider(settings.FRED_API_KEY).get_macro_snapshot()
        cls._macro_snapshot = snapshot
        cls._macro_expires_at = now + timedelta(seconds=MACRO_CACHE_TTL_SECONDS)
        await cls._write_cache(_MACRO_CACHE, _MACRO_CACHE_KEY, snapshot, MACRO_CACHE_TTL_SECONDS)
        return snapshot
```

In `_ensure_daily_calendar`, add `CACHE_LOOKUPS_TOTAL.labels(cache=_CALENDAR_CACHE, result="memory_hit").inc()` before the in-memory `return cls._calendar`; call `cls._read_cache(_CALENDAR_CACHE, _CALENDAR_CACHE_KEY, MarketCalendar)` and add the `redis_hit` increment before `return cached`; add the `miss` increment immediately before `provider = FmpProvider(settings.FMP_API_KEY)`; call `cls._write_cache(_CALENDAR_CACHE, _CALENDAR_CACHE_KEY, calendar, ttl_seconds)`.

Replace the two helpers:

```python
    @classmethod
    async def _read_cache(cls, cache: str, key: str, model: type[T]) -> T | None:
        client = cls._redis()
        if client is None:
            return None
        try:
            raw = await client.get(key)
            if not raw:
                return None
            return model.model_validate_json(raw)
        except Exception as exc:
            CACHE_ERRORS_TOTAL.labels(cache=cache, operation="read").inc()
            logger.warning("Redis cache read failed for %s: %s", key, exc)
            return None

    @classmethod
    async def _write_cache(cls, cache: str, key: str, value: BaseModel, ttl_seconds: int) -> None:
        client = cls._redis()
        if client is None:
            return
        try:
            await client.set(key, value.model_dump_json(), ex=ttl_seconds)
        except Exception as exc:
            CACHE_ERRORS_TOTAL.labels(cache=cache, operation="write").inc()
            logger.warning("Redis cache write failed for %s: %s", key, exc)
```

- [ ] **Step 5: Run focused and regression checks**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_market_calendar_cache_metrics.py tests/test_market_calendar_providers.py -v`

Expected: all passed (3 new + existing calendar tests).

Run: `.\.venv\Scripts\python.exe -m pytest -q` — Expected: green, 1 xfailed.

- [ ] **Step 6: Update `docs/spec/current-system/operations.md` Observability**

Replace the Prometheus bullet and the cache-hit bullet with:

```markdown
- `prometheus.yml` scrapes the backend (`/actuator/prometheus`) and the
  data-service (`data-service:8000/metrics`); Grafana is provisioned for local
  dashboards.
- Data-service metrics cover HTTP count/latency/errors, provider success/empty/
  error/fallback/blacklist state, agent latency/failures/estimated tokens, and
  macro/calendar cache lookups (`data_service_cache_lookups_total{cache,result}`
  with `memory_hit`, `redis_hit`, `miss`) plus Redis failures
  (`data_service_cache_errors_total{cache,operation}`).
- Spring cache-hit visibility remains an observability gap rather than a
  claimed metric.
```

- [ ] **Step 7: Commit**

```powershell
git add data-service/app/observability.py data-service/app/services/market_calendar_service.py data-service/tests/test_market_calendar_cache_metrics.py docs/spec/current-system/operations.md
git diff --cached --check
git commit -m "feat(data-service): export macro and calendar cache metrics"
```

---

## Plan Exit Criteria

- [ ] Every task has its own focused verification evidence.
- [ ] `CACHE_LOOKUPS_TOTAL` and `CACHE_ERRORS_TOTAL` exist with the exact metric names and labels above.
- [ ] Full data-service suite green, 1 xfailed.
- [ ] `git diff main -- prometheus.yml docker-compose.yml` is empty.
- [ ] Unrelated user changes remain unstaged and unmodified.

## Handoff

- Inputs made available: two cache counters scraped through the existing `python-data-service` Prometheus job.
- Conditions later plans may assume: macro/calendar cache behavior unchanged.
- Open risks carried forward: sentiment cache (`SENTIMENT_CACHE_TTL_SECONDS`) is not instrumented; owner: a follow-up observability change if needed.

## Self-Review

**Spec coverage:** The `operations.md` "cache-hit visibility" gap for the data-service caches named in that document (macro, calendar), and the wrong Prometheus-scrape sentence.

**Step scan:** Every code change is shown; the calendar edits are named line by line against the existing method.

**Type and name consistency:** `_read_cache`/`_write_cache` parameter order `(cache, key, …)` matches every call site; label values match the test helpers.

**Review focus:** All five items are exercised by Task 1 tests or Step 5.

**Proportion:** One task; two counters; no behavior change.
