# Data-Service Boundary Hardening Plan 2 — Configuration Hygiene and PROVIDER_CHAIN Implementation Plan

**Status:** Complete (2026-10-13) — commits `bb4da5f`. Step checkboxes were not ticked during execution; the plan-set table is the record.

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the MongoDB settings the data-service never reads, and make `PROVIDER_CHAIN` the real source of provider registration order.

**Architecture:** `app/config.py` loses two dead fields. `app/dependencies.py` gains a pure `build_provider_chain(raw_chain)` that parses the setting, creates providers in that order, skips unknown or unkeyed providers, and falls back to the default chain when nothing usable remains. `get_resolver()` keeps its signature. Backend, `.env.example`, and Compose keep their MongoDB entries because the backend still reads `MONGO_URI`.

**Tech Stack:** pydantic v2 `BaseModel` settings, pytest `monkeypatch`/`caplog`.

**Plan Set:** Plan 2 of 6 in `docs/superpowers/plans/2026-10-13-data-service-boundary-hardening.md`.

**Depends On:** Plan 1 (green characterization suite).

**Produces:** `app.dependencies.DEFAULT_PROVIDER_CHAIN: str`, `parse_provider_chain(raw: str) -> list[str]`, `build_provider_chain(raw_chain: str) -> list[IMarketDataProvider]`; updated `operations.md` configuration rows and `contracts.md` health row.

**Spec:** `docs/spec/current-system/operations.md` (Configuration table: `PROVIDER_CHAIN`, `MONGO_URI`, `MONGO_DB_NAME`); `docs/product/evidence/data-service.md` `CAP-CUR-DS-008` limitation; `DOC-CONFLICT-005`; `SPEC.md` open question on MongoDB.

## Locked Decisions

- Data-service drops `MONGO_URI` and `MONGO_DB_NAME`. `backend/src/main/resources/application.yml` still reads `MONGO_URI`, so `.env.example`, `docker-compose.yml`, and backend config are not touched. Whether MongoDB leaves the project entirely stays a `SPEC.md` open question.
- `PROVIDER_CHAIN` parsing: split on `,`, trim, lower-case, drop blanks, keep first occurrence of duplicates. Known names are exactly `yahoo`, `tiingo`, `finnhub`; an unknown name logs `WARNING` `unknown provider '<name>' in PROVIDER_CHAIN ignored`.
- Registration order equals the parsed order. A provider omitted from the chain is not registered, so its `/health/provider/<name>` route returns the existing 404 (this now applies to Yahoo too).
- A keyed provider without its API key, or whose constructor raises, is skipped with the existing warning text.
- If the configured chain yields no provider, log `ERROR` `PROVIDER_CHAIN=<raw> produced no usable provider; using default chain yahoo,tiingo,finnhub` and build the default chain. Yahoo needs no key, so the default always yields at least one provider. A resolver with zero providers would silently return empty data for every request; the logged fallback is the safer explicit outcome.
- Default value stays `yahoo,tiingo,finnhub`, so an unset variable keeps today's behavior.

## Global Constraints

- "Preserve endpoint paths and DTO fields unless every consumer changes together." (`AGENTS.md`)
- "When adding or changing a provider, register its resolver priority and health tracking explicitly, keep credentials server-side, and document its empty/error behavior and fallback position." (`operations.md`)
- "Never commit or expose secrets, provider credentials, `.env` …" — tests use literal fake keys such as `test-tiingo-key`; no real key is read.
- Preserve unrelated working-tree changes and exclude them from scoped commits.

## Review Focus

- **Misordered chain** — `tiingo,finnhub,yahoo` with keys must register in exactly that order. Task 2 `test_chain_order_follows_provider_chain`.
- **Typo disables every provider** — `PROVIDER_CHAIN=finhub` must not produce an empty resolver. Task 2 `test_unusable_chain_falls_back_to_default`.
- **Case/whitespace/duplicates** — ` Yahoo , yahoo ` must register Yahoo once. Task 2 `test_chain_normalizes_case_whitespace_and_duplicates`.
- **Unkeyed provider in chain** — `yahoo,tiingo` without `TIINGO_API_KEY` registers only Yahoo, without raising. Task 2 `test_default_chain_without_keys_registers_only_yahoo`.
- **Stale env var crashes startup** — a deployment still exporting `MONGO_URI` must construct `Settings` normally. Task 1 `test_settings_ignore_mongo_environment`.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `data-service/app/config.py:31-33` | Modify | Remove MongoDB fields |
| `data-service/app/dependencies.py` | Modify | Parse `PROVIDER_CHAIN` and build providers in order |
| `data-service/tests/test_config.py` | Create | Settings field guard |
| `data-service/tests/test_provider_chain.py` | Create | Chain parsing and construction |
| `docs/spec/current-system/operations.md` | Modify | Configuration rows |
| `docs/spec/current-system/contracts.md` | Modify | Yahoo health row 404 note |

---

## Task 1: Remove Unused MongoDB Settings

**Files:**
- Modify: `data-service/app/config.py:31-33`
- Modify: `docs/spec/current-system/operations.md` (rows `MONGO_URI`, `MONGO_DB_NAME`)
- Test: `data-service/tests/test_config.py`

**Interfaces:**
- Consumes: `app.config.Settings`.
- Produces: `Settings` without `MONGO_URI`/`MONGO_DB_NAME`.
- Preserves: every other `Settings` field and its env override; `validate_configuration()` output.

**Acceptance Evidence:**
- `rg -n "MONGO" data-service/app` prints nothing.
- New tests pass; full suite green.

- [ ] **Step 1: Write the failing test**

```python
from app.config import Settings


def test_settings_do_not_declare_mongo_fields():
    assert "MONGO_URI" not in Settings.model_fields
    assert "MONGO_DB_NAME" not in Settings.model_fields


def test_settings_ignore_mongo_environment(monkeypatch):
    monkeypatch.setenv("MONGO_URI", "mongodb://ignored:27017/financedb")

    assert not hasattr(Settings(), "MONGO_URI")
```

- [ ] **Step 2: Run it and confirm failure**

Run (from `data-service/`): `.\.venv\Scripts\python.exe -m pytest tests/test_config.py -v`

Expected: 2 FAIL — both fields are still declared.

- [ ] **Step 3: Delete the three MongoDB lines from `app/config.py`**

Remove exactly:

```python
    # --- MongoDB ---
    MONGO_URI: str = "mongodb://localhost:27017/financedb"
    MONGO_DB_NAME: str = "financedb"
```

and the blank line that follows, so `# --- Provider Resolver ---` follows the LLM block.

- [ ] **Step 4: Run focused and full checks**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_config.py -v` — Expected: 2 passed.

Run: `rg -n "MONGO" app main.py` — Expected: no output.

Run: `.\.venv\Scripts\python.exe -m pytest -q` — Expected: green, 1 xfailed.

- [ ] **Step 5: Update `docs/spec/current-system/operations.md`**

Replace the `MONGO_URI` row and delete the `MONGO_DB_NAME` row:

```markdown
| `MONGO_URI` | `mongodb://localhost:27017/financedb` | Read only by the backend (`spring.data.mongodb.uri`); the data-service does not read it; no durable product repository use was verified |
```

- [ ] **Step 6: Commit**

```powershell
git add data-service/app/config.py data-service/tests/test_config.py docs/spec/current-system/operations.md
git diff --cached --check
git commit -m "refactor(data-service): drop unused MongoDB settings"
```

---

## Task 2: Honor PROVIDER_CHAIN Order

**Files:**
- Modify: `data-service/app/dependencies.py` (replace `_build_resolver` body; remove unused `lru_cache` import)
- Modify: `docs/spec/current-system/operations.md` (`PROVIDER_CHAIN` row)
- Modify: `docs/spec/current-system/contracts.md` (`GET /health/provider/yahoo` row)
- Test: `data-service/tests/test_provider_chain.py`

**Interfaces:**
- Consumes: `settings.PROVIDER_CHAIN`, `settings.TIINGO_API_KEY`, `settings.FINNHUB_API_KEY`; `YahooProvider()`, `TiingoProvider(api_key)`, `FinnhubProvider(api_key)` (constructors do no network I/O).
- Produces: `DEFAULT_PROVIDER_CHAIN = "yahoo,tiingo,finnhub"`; `parse_provider_chain(raw: str) -> list[str]`; `build_provider_chain(raw_chain: str) -> list[IMarketDataProvider]`.
- Preserves: `get_resolver() -> MarketDataResolver` singleton behavior and startup log `MarketDataResolver: active chain = [...]`.

**Acceptance Evidence:**
- `pytest tests/test_provider_chain.py -v` passes 7 tests.
- Plan 1 suites stay green.

- [ ] **Step 1: Write the failing tests**

```python
import logging

import pytest

from app import dependencies
from app.config import settings


def _names(providers) -> list[str]:
    return [provider.provider_name for provider in providers]


@pytest.fixture
def no_keys(monkeypatch):
    monkeypatch.setattr(settings, "TIINGO_API_KEY", "")
    monkeypatch.setattr(settings, "FINNHUB_API_KEY", "")


@pytest.fixture
def all_keys(monkeypatch):
    monkeypatch.setattr(settings, "TIINGO_API_KEY", "test-tiingo-key")
    monkeypatch.setattr(settings, "FINNHUB_API_KEY", "test-finnhub-key")


def test_chain_order_follows_provider_chain(all_keys):
    assert _names(dependencies.build_provider_chain("tiingo,finnhub,yahoo")) == ["tiingo", "finnhub", "yahoo"]


def test_omitted_provider_is_not_registered(all_keys):
    assert _names(dependencies.build_provider_chain("tiingo")) == ["tiingo"]


def test_default_chain_without_keys_registers_only_yahoo(no_keys):
    assert _names(dependencies.build_provider_chain(dependencies.DEFAULT_PROVIDER_CHAIN)) == ["yahoo"]


def test_chain_normalizes_case_whitespace_and_duplicates(no_keys, caplog):
    with caplog.at_level(logging.WARNING, logger="app.dependencies"):
        assert _names(dependencies.build_provider_chain(" Yahoo , yahoo ,bogus")) == ["yahoo"]

    assert "unknown provider 'bogus' in PROVIDER_CHAIN ignored" in caplog.text


@pytest.mark.parametrize("raw", ["", " , ", "finnhub"])
def test_unusable_chain_falls_back_to_default(no_keys, caplog, raw):
    with caplog.at_level(logging.ERROR, logger="app.dependencies"):
        assert _names(dependencies.build_provider_chain(raw)) == ["yahoo"]

    assert "produced no usable provider" in caplog.text
```

- [ ] **Step 2: Run them and confirm failure**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_provider_chain.py -v`

Expected: 7 FAIL with `AttributeError: module 'app.dependencies' has no attribute 'build_provider_chain'` (or `DEFAULT_PROVIDER_CHAIN`).

- [ ] **Step 3: Replace the body of `app/dependencies.py` below the module docstring**

```python
from __future__ import annotations

import logging

from app.config import settings
from app.providers.base import IMarketDataProvider
from app.providers.market_data_resolver import MarketDataResolver
from app.providers.yahoo_provider import YahooProvider

logger = logging.getLogger(__name__)

DEFAULT_PROVIDER_CHAIN = "yahoo,tiingo,finnhub"
_KNOWN_PROVIDERS = ("yahoo", "tiingo", "finnhub")

_resolver: MarketDataResolver | None = None


def get_resolver() -> MarketDataResolver:
    """
    Return the application-scoped MarketDataResolver singleton.

    The provider chain is built lazily on first call, in PROVIDER_CHAIN order.
    """
    global _resolver
    if _resolver is None:
        _resolver = _build_resolver()
    return _resolver


def parse_provider_chain(raw: str) -> list[str]:
    """Return known provider names in configured order, lower-cased and de-duplicated."""
    names: list[str] = []
    for token in raw.split(","):
        name = token.strip().lower()
        if not name:
            continue
        if name not in _KNOWN_PROVIDERS:
            logger.warning("MarketDataResolver: unknown provider '%s' in PROVIDER_CHAIN ignored", name)
            continue
        if name not in names:
            names.append(name)
    return names


def build_provider_chain(raw_chain: str) -> list[IMarketDataProvider]:
    """Create providers in PROVIDER_CHAIN order, skipping unknown or unkeyed providers."""
    providers = _create_providers(parse_provider_chain(raw_chain))
    if providers:
        return providers
    logger.error(
        "MarketDataResolver: PROVIDER_CHAIN=%r produced no usable provider; using default chain %s",
        raw_chain,
        DEFAULT_PROVIDER_CHAIN,
    )
    return _create_providers(parse_provider_chain(DEFAULT_PROVIDER_CHAIN))


def _create_providers(names: list[str]) -> list[IMarketDataProvider]:
    providers = [_create_provider(name) for name in names]
    return [provider for provider in providers if provider is not None]


def _create_provider(name: str) -> IMarketDataProvider | None:
    if name == "yahoo":
        logger.info("MarketDataResolver: registered YahooProvider")
        return YahooProvider()

    if name == "tiingo":
        if not settings.TIINGO_API_KEY:
            logger.warning("MarketDataResolver: TIINGO_API_KEY not set — TiingoProvider disabled")
            return None
        try:
            from app.providers.tiingo_provider import TiingoProvider
            provider: IMarketDataProvider = TiingoProvider(api_key=settings.TIINGO_API_KEY)
        except Exception as exc:
            logger.warning("MarketDataResolver: failed to init TiingoProvider: %s", exc)
            return None
        logger.info("MarketDataResolver: registered TiingoProvider")
        return provider

    if not settings.FINNHUB_API_KEY:
        logger.warning("MarketDataResolver: FINNHUB_API_KEY not set — FinnhubProvider disabled")
        return None
    try:
        from app.providers.finnhub_provider import FinnhubProvider
        provider = FinnhubProvider(api_key=settings.FINNHUB_API_KEY)
    except Exception as exc:
        logger.warning("MarketDataResolver: failed to init FinnhubProvider: %s", exc)
        return None
    logger.info("MarketDataResolver: registered FinnhubProvider")
    return provider


def _build_resolver() -> MarketDataResolver:
    providers = build_provider_chain(settings.PROVIDER_CHAIN)
    logger.info(
        "MarketDataResolver: active chain = [%s]",
        ", ".join(p.provider_name for p in providers),
    )
    return MarketDataResolver(providers=providers)
```

Also change the module docstring's last sentence to: `Business code imports get_resolver() and never touches provider implementations directly. PROVIDER_CHAIN sets the registration order.`

- [ ] **Step 4: Run focused and full checks**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_provider_chain.py -v` — Expected: 7 passed.

Run: `.\.venv\Scripts\python.exe -m pytest -q` — Expected: green, 1 xfailed (Plan 1 wire tests still pass because they replace `get_resolver`).

- [ ] **Step 5: Update the docs**

`docs/spec/current-system/operations.md`, replace the `PROVIDER_CHAIN` row:

```markdown
| `PROVIDER_CHAIN` | `yahoo,tiingo,finnhub` | Data-service provider registration order. Names are trimmed, lower-cased, and de-duplicated; unknown names are logged and ignored; keyed providers without keys are skipped; omitted providers are not registered. A chain with no usable provider logs an error and falls back to the default order |
```

`docs/spec/current-system/contracts.md`, replace the Yahoo health row:

```markdown
| Health | `GET /health/provider/yahoo` | Yahoo provider health or 404 when unregistered |
```

- [ ] **Step 6: Commit**

```powershell
git add data-service/app/dependencies.py data-service/tests/test_provider_chain.py docs/spec/current-system/operations.md docs/spec/current-system/contracts.md
git diff --cached --check
git commit -m "feat(data-service): honor PROVIDER_CHAIN registration order"
```

---

## Plan Exit Criteria

- [ ] Every task has its own focused verification evidence.
- [ ] `build_provider_chain`, `parse_provider_chain`, and `DEFAULT_PROVIDER_CHAIN` exist with the exact agreed names.
- [ ] Full data-service suite green, 1 xfailed.
- [ ] `git diff main -- .env.example docker-compose.yml backend/` is empty.
- [ ] Unrelated user changes remain unstaged and unmodified.

## Handoff

- Inputs made available: `build_provider_chain(raw_chain)` for any future provider work.
- Conditions later plans may assume: the resolver's provider list matches `PROVIDER_CHAIN`; data-service has no MongoDB settings.
- Open risks carried forward: whether MongoDB leaves Compose and backend config remains the `SPEC.md` open question (owner: maintainer).

## Self-Review

**Spec coverage:** `MONGO_URI`/`MONGO_DB_NAME` (Task 1); `PROVIDER_CHAIN` order, filtering, and fallback (Task 2); both doc rows updated with their behavior.

**Step scan:** Every code step contains the full code; every run step names the command and expected result.

**Type and name consistency:** `build_provider_chain` is used by `_build_resolver` and the tests; the logger name `app.dependencies` matches `logging.getLogger(__name__)`.

**Review focus:** All five items map to named tests.

**Proportion:** Two focused production edits and two doc rows.
