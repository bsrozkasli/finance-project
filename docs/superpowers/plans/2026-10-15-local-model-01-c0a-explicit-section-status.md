# Local Model Decision-Support Plan 1 — C0a Explicit Section Availability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status: COMPLETE — 2026-10-15** (commits 39ac28e–8b32875 on `feat/local-model-phase-1`)

**Goal:** Every fabrication site named in spec §5 P1.1 reports an explicit, machine-readable availability state (`available`, `unavailable`, `insufficient`, `unparseable`) next to its unchanged legacy values, and the C0b compatibility matrix exists as input to D-2.

**Architecture:** One shared pydantic value object, `SectionAvailability`, is added to the four affected response models as new required fields. Each service sets it from the failure branch it already has; no branch changes the numbers, labels, or HTTP status it returns today. Spring adapters already ignore unknown JSON properties (`new RestTemplate()` uses `Jackson2ObjectMapperBuilder`, which disables `FAIL_ON_UNKNOWN_PROPERTIES`); backend test-only tasks prove this for every consumer DTO instead of assuming it. React is untouched because no backend DTO forwards the new fields.

**Tech Stack:** Python 3.13, FastAPI, pydantic v2 (`model_validator`, `Literal`), pytest 9 `asyncio_mode=auto`, `httpx.MockTransport`, `monkeypatch`; Java 21/Spring Boot test with `MockRestServiceServer`, AssertJ; Markdown.

**Plan Set:** Plan 1 of 5 in `docs/superpowers/plans/2026-10-15-local-model-decision-support-plan-set.md`.

**Depends On:** Plan set execution preconditions (hardening merged; `tests/conftest.py` with `ScriptedProvider` exists; data-service baseline recorded).

**Produces:**
- `app.models.availability.SectionStatus`, `app.models.availability.SectionAvailability` with factories `available()`, `unavailable(reason)`, `insufficient(reason)`, `unparseable(reason)`.
- New response fields: `SentimentAnalysisResponse.availability`; `EnhancedSentimentResponse.news_availability`, `.analyst_availability`, `.insider_availability`, `.unavailable_components`; `CompositeInvestmentScore.breakdown_availability`, `.unavailable_components`; `AgentAnalysisResponse.decision_availability`.
- `app.agents.portfolio_manager.PortfolioManagerVerdict` and `run_portfolio_manager_verdict(llm, ticker, debate_context) -> PortfolioManagerVerdict`.
- Test fixture `wire_async_client` in `data-service/tests/conftest.py`.
- `docs/product/evidence/c0b-compatibility-matrix.md`.

**Spec:** `docs/superpowers/specs/2026-10-15-local-model-decision-support-design.md` §4.2, §5 P1.1, §8 first bullet, §9 first two bullets.

## Locked Decisions

- **Wire shape.** Every availability value serializes as `{"status": "<state>", "unavailable_reason": "<code>" | null}`. `status == "available"` ⇔ `unavailable_reason is null`. Reasons are snake_case codes matching `^[a-z][a-z0-9_]{0,63}$`; raw exception text is never placed in a reason, because Finnhub client errors carry `token=` query parameters.
- **Required, not defaulted.** New fields have no default. A future code path that forgets to set availability fails pydantic validation instead of silently claiming `available`. The one existing test that builds `AgentAnalysisResponse` directly (`tests/test_agent_analysis_endpoint.py`) is updated to pass `decision_availability`.
- **Values and statuses stay.** No legacy field changes name, type, or value; no HTTP status changes; no exception path becomes a 200. In particular the `AttributeError` raised when the LLM returns a JSON array to `SentimentService` stays a 503 (see Handoff).
- **Status semantics.**
  - `unavailable` — the source failed, was not called, or its value was not read by this code (`*_not_mapped`).
  - `insufficient` — the source answered, but with no or too little evidence.
  - `unparseable` — an LLM answered, but its text did not yield the required fields.
- **Reason vocabulary (exhaustive for this plan).**

  | Response | Section | Condition | Status | Reason |
  |---|---|---|---|---|
  | `SentimentAnalysisResponse` | `availability` | no article inside `NEWS_LOOKBACK_HOURS` | insufficient | `no_articles_in_lookback` |
  | 〃 | 〃 | LLM content is not JSON | unparseable | `llm_response_not_json` |
  | 〃 | 〃 | JSON `score` not convertible to float | unparseable | `llm_response_invalid_score` |
  | 〃 | 〃 | JSON lacks `score` or `label` | unparseable | `llm_response_missing_fields` |
  | `EnhancedSentimentResponse` | `news_availability` | `SentimentService` raised | unavailable | `news_sentiment_failed` |
  | 〃 | 〃 | `SentimentService` returned non-available | copied from `SentimentService` | copied |
  | 〃 | `analyst_availability` | HTTP/parse exception | unavailable | `analyst_fetch_failed` |
  | 〃 | 〃 | empty recommendation list | insufficient | `no_analyst_recommendations` |
  | 〃 | 〃 | latest entry has zero total votes | insufficient | `analyst_counts_empty` |
  | 〃 | `insider_availability` | HTTP/parse exception | unavailable | `insider_fetch_failed` |
  | 〃 | 〃 | empty transaction list | insufficient | `no_insider_transactions` |
  | `CompositeInvestmentScore` | `breakdown_availability[quality_score/growth_score/momentum_score/risk_score]` | factor fetch failed | unavailable | `factor_component_unavailable` |
  | 〃 | 〃 | factor object lacks the attribute (PF-1) | unavailable | `factor_score_not_mapped` |
  | 〃 | 〃 | attribute is `None` | insufficient | `factor_score_missing` |
  | 〃 | `[fundamental_score]` | quality or growth not available | unavailable | `derived_from_defaulted_fields` |
  | 〃 | `[valuation_score]` | fetch failed / attr absent (PF-1) / `None` / no grade keyword | unavailable / unavailable / insufficient / insufficient | `valuation_component_unavailable` / `valuation_grade_not_mapped` / `valuation_grade_missing` / `valuation_grade_unrecognized` |
  | 〃 | `[earnings_score]` | fetch failed / attr absent (PF-1) / `None` | unavailable / unavailable / insufficient | `earnings_component_unavailable` / `earnings_score_not_mapped` / `earnings_score_missing` |
  | 〃 | `[sentiment_score]` | fetch failed / attr absent / `None` / enhanced sentiment had defaulted sections | unavailable / unavailable / insufficient / insufficient | `sentiment_component_unavailable` / `sentiment_score_not_mapped` / `sentiment_score_missing` / `sentiment_sections_unavailable` |
  | `AgentAnalysisResponse` | `decision_availability` | JSON object lacks valid `decision` ∈ {BUY, HOLD, SELL} or integer `confidence` | unparseable | `pm_json_missing_or_invalid_fields` |
  | 〃 | 〃 | no JSON; keyword `BUY`/`SELL` used | unparseable | `pm_response_not_json_keyword_fallback` |
  | 〃 | 〃 | no JSON; no keyword, default `HOLD` 50 | unparseable | `pm_response_not_json_default_hold` |

- **Composite `unavailable_components`** lists, in fetch order, the names among `fundamental`, `valuation`, `factor`, `risk`, `earnings`, `sentiment` whose fetch returned no result. **Enhanced sentiment `unavailable_components`** lists, in order, `news`, `analyst`, `insider` whose status is not `available`.
- **`run_portfolio_manager` keeps its 4-tuple contract**; it delegates to the new `run_portfolio_manager_verdict`. The graph switches to the verdict function.
- **No data-service DTO is consumed raw by React.** Backend DTOs drop the new fields; React is verified by running its suites, not by editing it.
- **PF-1 is reported, not fixed** (D-6).

## Global Constraints

- "Represent provider failure explicitly as unavailable, insufficient, empty, partial, or stale data; never replace missing evidence with synthetic values." (`AGENTS.md`)
- "Preserve endpoint paths and DTO fields unless every consumer changes together." (`AGENTS.md`)
- "Each affected response gains an explicit availability field per section … Existing numeric and label fields keep their current values and types." (spec §5 P1.1 C0a)
- "Every fabrication site in P1.1 reports an explicit status on its failure branch; no existing field changes type or value; all current consumer tests stay green." (spec §8)
- "Use stubs, fakes, or wire-level mocks only at I/O boundaries … state a one-line reason for each mocked dependency." (`docs/agent/verification.md`)
- "In test-only tasks, do not change production source." (`AGENTS.md`) — applies to Task 6.
- Preserve unrelated working-tree changes.

## Review Focus

- **Secret text in a reason.** A Finnhub failure whose message contains `token=secret-123` must not appear in any availability reason. Task 1 `test_reason_must_be_a_snake_case_code` rejects free text; Task 3 `test_analyst_http_failure_reports_unavailable_without_leaking` asserts the reason equals the fixed code and the token is absent from `model_dump_json()`.
- **"No news" shown as neutral without a flag.** Zero articles must produce `insufficient` with `score == 0.0` and `label == "NEUTRAL"` unchanged. Task 2 `test_no_articles_reports_insufficient`, and through the route in `test_sentiment_route_serializes_availability`.
- **Composite claims available evidence it never read (PF-1).** Production-shaped factor, valuation, and earnings responses must yield `*_not_mapped`, with values still `50`. Task 4 `test_production_shaped_inputs_report_not_mapped_and_keep_values`.
- **Keyword-guessed decision reported as available.** `"We should SELL"` must yield `decision == "SELL"`, `confidence == 70`, status `unparseable`. Task 5 `test_keyword_fallback_is_unparseable`; JSON with `"decision": "STRONG BUY"` must also be `unparseable`, Task 5 `test_json_with_invalid_decision_is_unparseable`.
- **A Spring consumer silently drops the whole payload.** Every Spring adapter swallows exceptions into `Optional.empty()`, so an unknown-field failure would look like "provider unavailable". Task 6 asserts each adapter returns a populated result when the new fields are present.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `data-service/app/models/availability.py` | Create | `SectionStatus`, `SectionAvailability` |
| `data-service/tests/test_section_availability.py` | Create | Value-object invariants |
| `data-service/tests/conftest.py` | Modify | `wire_async_client` fixture (httpx boundary) |
| `data-service/app/models/analysis.py:49-58` | Modify | `SentimentAnalysisResponse.availability` |
| `data-service/app/services/sentiment_service.py:43-152` | Modify | Set availability on each branch |
| `data-service/tests/test_sentiment_service_availability.py` | Create | Sentiment branches and route serialization |
| `data-service/app/models/sentiment.py:31-52` | Modify | Enhanced sentiment availability fields |
| `data-service/app/services/enhanced_sentiment_service.py:28-226` | Modify | Per-section availability |
| `data-service/tests/test_enhanced_sentiment_availability.py` | Create | News/analyst/insider branches |
| `data-service/app/models/composite.py:29-36` | Modify | `breakdown_availability`, `unavailable_components` |
| `data-service/app/services/composite_score_service.py:67-171` | Modify | Score readers return `(value, availability)` |
| `data-service/tests/test_composite_score_availability.py` | Create | Composite branches, value preservation, PF-1 |
| `data-service/app/models/agent_analysis.py:13-22` | Modify | `AgentAnalysisResponse.decision_availability` |
| `data-service/app/agents/portfolio_manager.py` | Modify | Verdict with availability; tuple API kept |
| `data-service/app/trading_agents/metrics_trading_graph.py:85-99` | Modify | Use verdict |
| `data-service/tests/test_agents.py` | Modify | Append verdict tests |
| `data-service/tests/test_metrics_trading_graph.py` | Modify | Assert availability on graph output |
| `data-service/tests/test_agent_analysis_endpoint.py:29-39` | Modify | Pass `decision_availability` to the fake |
| `backend/src/test/java/com/ozkaslibasar/financeproject/adapter/outbound/client/dataservice/DataServiceC0aCompatibilityTest.java` | Create | Spring consumers tolerate the additive fields |
| `docs/spec/current-system/contracts.md` | Modify | Data-service rows and availability note |
| `docs/product/evidence/c0b-compatibility-matrix.md` | Create | Source field → consumer → disposition options |

---

## Task 1: `SectionAvailability` Value Object

**Files:**
- Create: `data-service/app/models/availability.py`
- Test: `data-service/tests/test_section_availability.py`

**Interfaces:**
- Consumes: nothing.
- Produces: `SectionStatus = Literal["available", "unavailable", "insufficient", "unparseable"]`; `SectionAvailability(status, unavailable_reason)` frozen model with classmethods `available() -> SectionAvailability`, `unavailable(reason: str)`, `insufficient(reason: str)`, `unparseable(reason: str)`.
- Preserves: every existing model.

**Acceptance Evidence:**
- `pytest tests/test_section_availability.py -v` → 9 passed.

- [ ] **Step 1: Write the failing tests**

```python
"""Invariants of the explicit evidence-availability value object (C0a)."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.models.availability import SectionAvailability


def test_available_has_no_reason():
    assert SectionAvailability.available().model_dump() == {"status": "available", "unavailable_reason": None}


@pytest.mark.parametrize(
    ("factory", "status"),
    [
        (SectionAvailability.unavailable, "unavailable"),
        (SectionAvailability.insufficient, "insufficient"),
        (SectionAvailability.unparseable, "unparseable"),
    ],
)
def test_non_available_states_carry_their_reason(factory, status):
    assert factory("no_articles_in_lookback").model_dump() == {
        "status": status,
        "unavailable_reason": "no_articles_in_lookback",
    }


def test_available_with_reason_is_rejected():
    with pytest.raises(ValidationError):
        SectionAvailability(status="available", unavailable_reason="no_articles_in_lookback")


def test_unavailable_without_reason_is_rejected():
    with pytest.raises(ValidationError):
        SectionAvailability(status="unavailable")


def test_unknown_status_is_rejected():
    with pytest.raises(ValidationError):
        SectionAvailability(status="partial", unavailable_reason="some_reason")


def test_reason_must_be_a_snake_case_code():
    with pytest.raises(ValidationError):
        SectionAvailability.unavailable("token=secret-123 upstream failed")


def test_value_object_is_immutable():
    availability = SectionAvailability.available()
    with pytest.raises(ValidationError):
        availability.status = "unavailable"
```

- [ ] **Step 2: Run them and confirm failure**

Run (from `data-service/`): `.\.venv\Scripts\python.exe -m pytest tests/test_section_availability.py -v`

Expected: collection error `ModuleNotFoundError: No module named 'app.models.availability'`.

- [ ] **Step 3: Create `app/models/availability.py`**

```python
"""Explicit evidence-availability state shared by analytics responses (C0a).

Legacy numeric and label fields keep their historical defaults; this object
tells consumers whether those values are real evidence.
"""

from __future__ import annotations

import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, model_validator

SectionStatus = Literal["available", "unavailable", "insufficient", "unparseable"]

_REASON_CODE = re.compile(r"^[a-z][a-z0-9_]{0,63}$")


class SectionAvailability(BaseModel):
    model_config = ConfigDict(frozen=True)

    status: SectionStatus
    unavailable_reason: str | None = None

    @model_validator(mode="after")
    def _reason_matches_status(self) -> "SectionAvailability":
        if self.status == "available":
            if self.unavailable_reason is not None:
                raise ValueError("an available section has no unavailable_reason")
        elif self.unavailable_reason is None or not _REASON_CODE.fullmatch(self.unavailable_reason):
            raise ValueError("a non-available section needs a snake_case unavailable_reason code")
        return self

    @classmethod
    def available(cls) -> "SectionAvailability":
        return cls(status="available")

    @classmethod
    def unavailable(cls, reason: str) -> "SectionAvailability":
        return cls(status="unavailable", unavailable_reason=reason)

    @classmethod
    def insufficient(cls, reason: str) -> "SectionAvailability":
        return cls(status="insufficient", unavailable_reason=reason)

    @classmethod
    def unparseable(cls, reason: str) -> "SectionAvailability":
        return cls(status="unparseable", unavailable_reason=reason)
```

- [ ] **Step 4: Run the focused check and confirm it passes**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_section_availability.py -v`

Expected: 9 passed (the parametrized test counts three times).

- [ ] **Step 5: Run the plan-level regression check**

Run: `.\.venv\Scripts\python.exe -m pytest -q`

Expected: baseline + 9 passed, 1 xfailed.

- [ ] **Step 6: Commit atomically**

```powershell
git add data-service/app/models/availability.py data-service/tests/test_section_availability.py
git diff --cached --check
git commit -m "feat(data-service): add explicit section availability value object"
```

---

## Task 2: Sentiment Availability

**Files:**
- Modify: `data-service/tests/conftest.py` (append fixture)
- Modify: `data-service/app/models/analysis.py:49-58`
- Modify: `data-service/app/services/sentiment_service.py:43-54`, `:128-152`
- Test: `data-service/tests/test_sentiment_service_availability.py`

**Interfaces:**
- Consumes: `SectionAvailability` (Task 1).
- Produces: `SentimentAnalysisResponse.availability: SectionAvailability`; `wire_async_client(handler)` fixture that routes every `httpx.AsyncClient` created during the test through `httpx.MockTransport(handler)`.
- Preserves: `score`, `label`, lists, `article_count`, `articles_analyzed`; `ValueError` for missing keys; route 503 mapping; `AttributeError` on non-dict JSON.

**Acceptance Evidence:**
- `pytest tests/test_sentiment_service_availability.py -v` → 6 passed.

- [ ] **Step 1: Add the boundary fixture to `tests/conftest.py`**

Append (and add `import httpx` to the imports):

```python
@pytest.fixture
def wire_async_client(monkeypatch):
    """Route every httpx.AsyncClient built during a test through a MockTransport.

    Mocked boundary: outbound HTTP to Finnhub and Azure OpenAI, so no test reaches a live provider.
    """
    real_async_client = httpx.AsyncClient

    def _install(handler):
        def _factory(*args, **kwargs):
            kwargs["transport"] = httpx.MockTransport(handler)
            return real_async_client(*args, **kwargs)

        monkeypatch.setattr(httpx, "AsyncClient", _factory)

    return _install
```

- [ ] **Step 2: Write the failing tests**

```python
"""SentimentService reports explicit availability on every branch (C0a)."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.services import sentiment_service
from app.services.sentiment_service import SentimentService
from main import app


class FakeFinnhubClient:
    """Stands in for finnhub.Client (boundary: live Finnhub company-news API)."""

    news: list[dict] = []

    def __init__(self, api_key: str) -> None:
        self.api_key = api_key

    def company_news(self, symbol, _from, to):
        return list(type(self).news)


@pytest.fixture
def configured(monkeypatch):
    monkeypatch.setattr(settings, "FINNHUB_API_KEY", "test-finnhub-key")
    monkeypatch.setattr(settings, "AZURE_OPENAI_API_KEY", "test-azure-key")
    monkeypatch.setattr(settings, "AZURE_OPENAI_ENDPOINT", "https://azure.test")
    monkeypatch.setattr(settings, "AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-test")
    monkeypatch.setattr(sentiment_service.finnhub, "Client", FakeFinnhubClient)
    monkeypatch.setattr(FakeFinnhubClient, "news", [])


def _recent_article() -> dict:
    published = int((datetime.now(timezone.utc) - timedelta(hours=1)).timestamp())
    return {"datetime": published, "headline": "Apple ships product", "summary": "s", "source": "wire", "url": "https://news.test/a"}


def _llm_content(content: str):
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.host == "azure.test"
        return httpx.Response(200, json={"choices": [{"message": {"content": content}}]})

    return handler


async def test_no_articles_reports_insufficient(configured):
    result = await SentimentService.analyze_sentiment("aapl")

    assert result.availability.model_dump() == {"status": "insufficient", "unavailable_reason": "no_articles_in_lookback"}
    assert (result.score, result.label, result.article_count) == (0.0, "NEUTRAL", 0)


async def test_non_json_llm_output_reports_unparseable(configured, monkeypatch, wire_async_client):
    monkeypatch.setattr(FakeFinnhubClient, "news", [_recent_article()])
    wire_async_client(_llm_content("I think it is mildly positive."))

    result = await SentimentService.analyze_sentiment("AAPL")

    assert result.availability.model_dump() == {"status": "unparseable", "unavailable_reason": "llm_response_not_json"}
    assert (result.score, result.label, result.article_count) == (0.0, "NEUTRAL", 1)


async def test_non_numeric_score_reports_unparseable(configured, monkeypatch, wire_async_client):
    monkeypatch.setattr(FakeFinnhubClient, "news", [_recent_article()])
    wire_async_client(_llm_content(json.dumps({"score": "high", "label": "BULLISH"})))

    result = await SentimentService.analyze_sentiment("AAPL")

    assert result.availability.unavailable_reason == "llm_response_invalid_score"
    assert (result.score, result.label) == (0.0, "NEUTRAL")


async def test_missing_score_reports_unparseable_and_keeps_label(configured, monkeypatch, wire_async_client):
    monkeypatch.setattr(FakeFinnhubClient, "news", [_recent_article()])
    wire_async_client(_llm_content(json.dumps({"label": "BULLISH"})))

    result = await SentimentService.analyze_sentiment("AAPL")

    assert result.availability.model_dump() == {"status": "unparseable", "unavailable_reason": "llm_response_missing_fields"}
    assert (result.score, result.label) == (0.0, "BULLISH")


async def test_complete_llm_output_reports_available(configured, monkeypatch, wire_async_client):
    monkeypatch.setattr(FakeFinnhubClient, "news", [_recent_article()])
    fence = "`" * 3  # the LLM may wrap its JSON in a markdown code fence
    wire_async_client(_llm_content(fence + "json\n" + json.dumps({"score": 0.4, "label": "BULLISH", "key_themes": ["launch"]}) + "\n" + fence))

    result = await SentimentService.analyze_sentiment("AAPL")

    assert result.availability.model_dump() == {"status": "available", "unavailable_reason": None}
    assert (result.score, result.label, result.key_themes) == (0.4, "BULLISH", ["launch"])


def test_sentiment_route_serializes_availability(configured):
    response = TestClient(app).get("/api/v1/sentiment/AAPL")

    assert response.status_code == 200
    body = response.json()
    assert body["availability"] == {"status": "insufficient", "unavailable_reason": "no_articles_in_lookback"}
    assert (body["score"], body["label"]) == (0.0, "NEUTRAL")
```

- [ ] **Step 3: Run them and confirm failure**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_sentiment_service_availability.py -v`

Expected: 6 FAIL with `AttributeError: 'SentimentAnalysisResponse' object has no attribute 'availability'` (route test: `KeyError: 'availability'`).

- [ ] **Step 4: Add the field to `SentimentAnalysisResponse`**

In `app/models/analysis.py` add `from app.models.availability import SectionAvailability` to the imports and append one field after `calculated_at`:

```python
    calculated_at: datetime
    availability: SectionAvailability
```

- [ ] **Step 5: Set availability in `SentimentService`**

Add `from app.models.availability import SectionAvailability` to the imports. In the empty-news return (lines 43-54) add `availability=SectionAvailability.insufficient("no_articles_in_lookback"),` after `calculated_at=now`. Replace the parse block and final return (lines 128-152) with:

```python
        try:
            parsed = json.loads(content)
            score = float(parsed.get("score", 0.0))
            label = parsed.get("label", "NEUTRAL")
            key_themes = parsed.get("key_themes", [])
            risk_factors = parsed.get("risk_factors", [])
            opportunity_factors = parsed.get("opportunity_factors", [])
            if "score" in parsed and "label" in parsed:
                availability = SectionAvailability.available()
            else:
                availability = SectionAvailability.unparseable("llm_response_missing_fields")
        except (json.JSONDecodeError, ValueError) as exc:
            score = 0.0
            label = "NEUTRAL"
            key_themes = []
            risk_factors = []
            opportunity_factors = []
            reason = "llm_response_not_json" if isinstance(exc, json.JSONDecodeError) else "llm_response_invalid_score"
            availability = SectionAvailability.unparseable(reason)

        return SentimentAnalysisResponse(
            symbol=symbol,
            score=score,
            label=label,
            key_themes=key_themes[:3],
            risk_factors=risk_factors[:2],
            opportunity_factors=opportunity_factors[:2],
            article_count=len(filtered_news),
            articles_analyzed=articles_analyzed,
            calculated_at=now,
            availability=availability,
        )
```

`json.JSONDecodeError` subclasses `ValueError`, so the single `except` keeps the existing catch set exactly.

- [ ] **Step 6: Run focused and full checks**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_sentiment_service_availability.py tests/test_analysis_failure_paths.py -v` — Expected: all passed (the `/full` tests run with `FINNHUB_API_KEY=""`, so sentiment stays `null`).

Run: `.\.venv\Scripts\python.exe -m pytest -q` — Expected: green, 1 xfailed.

- [ ] **Step 7: Commit**

```powershell
git add data-service/tests/conftest.py data-service/app/models/analysis.py data-service/app/services/sentiment_service.py data-service/tests/test_sentiment_service_availability.py
git diff --cached --check
git commit -m "feat(data-service): report explicit sentiment availability"
```

---

## Task 3: Enhanced Sentiment Per-Section Availability

**Files:**
- Modify: `data-service/app/models/sentiment.py:31-52`
- Modify: `data-service/app/services/enhanced_sentiment_service.py:28-226`
- Test: `data-service/tests/test_enhanced_sentiment_availability.py`

**Interfaces:**
- Consumes: `SectionAvailability` (Task 1); `SentimentAnalysisResponse.availability` (Task 2); `wire_async_client` (Task 2).
- Produces: `EnhancedSentimentResponse.news_availability`, `.analyst_availability`, `.insider_availability: SectionAvailability`; `.unavailable_components: list[str]`. Private helpers now return a trailing `SectionAvailability`: `_fetch_news_sentiment -> tuple[float, str, SectionAvailability]`, `_fetch_analyst_data -> tuple[float, str, AnalystRecommendation | None, SectionAvailability]`, `_fetch_insider_data -> tuple[float, str, list[InsiderTransaction], SectionAvailability]`.
- Preserves: every score, label, consensus, summary, transaction list, `sentiment_score` formula, and existing log lines.

**Acceptance Evidence:**
- `pytest tests/test_enhanced_sentiment_availability.py -v` → 7 passed.

- [ ] **Step 1: Write the failing tests**

```python
"""EnhancedSentimentService reports availability per section (C0a)."""

from __future__ import annotations

from datetime import datetime, timezone

import httpx
import pytest

from app.config import settings
from app.models.analysis import SentimentAnalysisResponse
from app.models.availability import SectionAvailability
from app.services.enhanced_sentiment_service import EnhancedSentimentService
from app.services.sentiment_service import SentimentService


def _news(availability: SectionAvailability, score: float = 0.0, label: str = "NEUTRAL") -> SentimentAnalysisResponse:
    return SentimentAnalysisResponse(
        symbol="AAPL", score=score, label=label, article_count=0, articles_analyzed=[],
        calculated_at=datetime.now(timezone.utc), availability=availability,
    )


@pytest.fixture
def news_returns(monkeypatch):
    """Replaces SentimentService (its own branches are covered by Task 2 tests)."""

    def _install(result):
        async def fake(symbol):
            if isinstance(result, Exception):
                raise result
            return result

        monkeypatch.setattr(SentimentService, "analyze_sentiment", fake)

    return _install


@pytest.fixture
def finnhub_http(monkeypatch, wire_async_client):
    """Scripts Finnhub REST responses per path (boundary: live Finnhub API)."""
    monkeypatch.setattr(settings, "FINNHUB_API_KEY", "secret-123")

    def _install(recommendation, insider):
        def handler(request: httpx.Request) -> httpx.Response:
            body = recommendation if request.url.path.endswith("/stock/recommendation") else insider
            if isinstance(body, int):
                return httpx.Response(body, json={"error": f"token={request.url.params['token']} rejected"})
            return httpx.Response(200, json=body)

        wire_async_client(handler)

    return _install


_ONE_PURCHASE = {"data": [{"name": "Jane Doe", "title": "CEO", "transactionCode": "P", "change": 100, "transactionPrice": 10.0, "transactionDate": "2026-10-01"}]}
_VOTES = [{"period": "2026-10-01", "strongBuy": 5, "buy": 3, "hold": 2, "sell": 0, "strongSell": 0}]


async def test_all_sections_available(news_returns, finnhub_http):
    news_returns(_news(SectionAvailability.available(), 0.4, "BULLISH"))
    finnhub_http(_VOTES, _ONE_PURCHASE)

    result = await EnhancedSentimentService.analyze("AAPL")

    assert [result.news_availability.status, result.analyst_availability.status, result.insider_availability.status] == ["available"] * 3
    assert result.unavailable_components == []
    assert (result.news_score, result.analyst_consensus) == (0.4, "Strong Buy")


async def test_news_failure_reports_unavailable_and_keeps_neutral(news_returns, finnhub_http):
    news_returns(RuntimeError("azure down"))
    finnhub_http(_VOTES, _ONE_PURCHASE)

    result = await EnhancedSentimentService.analyze("AAPL")

    assert result.news_availability.model_dump() == {"status": "unavailable", "unavailable_reason": "news_sentiment_failed"}
    assert (result.news_score, result.news_label) == (0.0, "NEUTRAL")
    assert result.unavailable_components == ["news"]


async def test_news_without_articles_propagates_insufficient(news_returns, finnhub_http):
    news_returns(_news(SectionAvailability.insufficient("no_articles_in_lookback")))
    finnhub_http(_VOTES, _ONE_PURCHASE)

    result = await EnhancedSentimentService.analyze("AAPL")

    assert result.news_availability.unavailable_reason == "no_articles_in_lookback"
    assert result.unavailable_components == ["news"]


async def test_empty_analyst_list_reports_insufficient(news_returns, finnhub_http):
    news_returns(_news(SectionAvailability.available()))
    finnhub_http([], _ONE_PURCHASE)

    result = await EnhancedSentimentService.analyze("AAPL")

    assert result.analyst_availability.model_dump() == {"status": "insufficient", "unavailable_reason": "no_analyst_recommendations"}
    assert (result.analyst_score, result.analyst_consensus, result.analyst_data) == (0.0, "Hold", None)


async def test_zero_vote_analyst_entry_reports_insufficient(news_returns, finnhub_http):
    news_returns(_news(SectionAvailability.available()))
    finnhub_http([{"period": "2026-10-01", "strongBuy": 0, "buy": 0, "hold": 0, "sell": 0, "strongSell": 0}], _ONE_PURCHASE)

    result = await EnhancedSentimentService.analyze("AAPL")

    assert result.analyst_availability.unavailable_reason == "analyst_counts_empty"
    assert (result.analyst_score, result.analyst_consensus) == (0.0, "Hold")


async def test_analyst_http_failure_reports_unavailable_without_leaking(news_returns, finnhub_http):
    news_returns(_news(SectionAvailability.available()))
    finnhub_http(403, _ONE_PURCHASE)

    result = await EnhancedSentimentService.analyze("AAPL")

    assert result.analyst_availability.model_dump() == {"status": "unavailable", "unavailable_reason": "analyst_fetch_failed"}
    assert "secret-123" not in result.model_dump_json()


async def test_insider_branches(news_returns, finnhub_http):
    news_returns(_news(SectionAvailability.available()))
    finnhub_http(_VOTES, {"data": []})
    empty = await EnhancedSentimentService.analyze("AAPL")

    finnhub_http(_VOTES, 500)
    failed = await EnhancedSentimentService.analyze("AAPL")

    assert empty.insider_availability.model_dump() == {"status": "insufficient", "unavailable_reason": "no_insider_transactions"}
    assert (empty.insider_score, empty.insider_summary) == (0.0, "No recent insider activity")
    assert failed.insider_availability.model_dump() == {"status": "unavailable", "unavailable_reason": "insider_fetch_failed"}
    assert (failed.insider_score, failed.insider_summary) == (0.0, "No insider data available")
```

- [ ] **Step 2: Run them and confirm failure**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_enhanced_sentiment_availability.py -v`

Expected: 7 FAIL — `AttributeError: 'EnhancedSentimentResponse' object has no attribute 'news_availability'`.

- [ ] **Step 3: Add the fields to `EnhancedSentimentResponse`**

In `app/models/sentiment.py` import `SectionAvailability` and append after `calculated_at`:

```python
    calculated_at: datetime

    # Explicit availability per section (legacy scores above keep their neutral defaults)
    news_availability: SectionAvailability
    analyst_availability: SectionAvailability
    insider_availability: SectionAvailability
    unavailable_components: list[str]
```

- [ ] **Step 4: Thread availability through `EnhancedSentimentService`**

Import `SectionAvailability`. Replace the body of `analyze` after `now = ...` with:

```python
        news_score, news_label, news_availability = await cls._fetch_news_sentiment(symbol)
        analyst_score, analyst_consensus, analyst_data, analyst_availability = await cls._fetch_analyst_data(symbol)
        insider_score, insider_summary, insider_txns, insider_availability = await cls._fetch_insider_data(symbol)

        sentiment_score = cls._compute_composite(news_score, analyst_score, insider_score)
        sections = {"news": news_availability, "analyst": analyst_availability, "insider": insider_availability}

        return EnhancedSentimentResponse(
            symbol=symbol,
            news_score=news_score,
            news_label=news_label,
            analyst_score=analyst_score,
            analyst_consensus=analyst_consensus,
            analyst_data=analyst_data,
            insider_score=insider_score,
            insider_summary=insider_summary,
            recent_insider_transactions=insider_txns,
            sentiment_score=sentiment_score,
            calculated_at=now,
            news_availability=news_availability,
            analyst_availability=analyst_availability,
            insider_availability=insider_availability,
            unavailable_components=[name for name, availability in sections.items() if availability.status != "available"],
        )
```

Edit the helpers, keeping every value and log line:

- `_fetch_news_sentiment`: return annotation `tuple[float, str, SectionAvailability]`; success returns `news_result.score, news_result.label, news_result.availability`; the `except` returns `0.0, "NEUTRAL", SectionAvailability.unavailable("news_sentiment_failed")`.
- `_fetch_analyst_data`: annotation `tuple[float, str, AnalystRecommendation | None, SectionAvailability]`; `if not data:` returns `0.0, "Hold", None, SectionAvailability.insufficient("no_analyst_recommendations")`; before the success `return` add

  ```python
            if strong_buy + buy + hold + sell + strong_sell > 0:
                availability = SectionAvailability.available()
            else:
                availability = SectionAvailability.insufficient("analyst_counts_empty")
  ```

  and return `analyst_score, consensus, analyst_rec, availability`; the `except` returns `0.0, "Hold", None, SectionAvailability.unavailable("analyst_fetch_failed")`.
- `_fetch_insider_data`: annotation `tuple[float, str, list[InsiderTransaction], SectionAvailability]`; empty list returns `0.0, "No recent insider activity", [], SectionAvailability.insufficient("no_insider_transactions")`; success returns `insider_score, summary, insider_txns, SectionAvailability.available()`; the `except` returns `0.0, "No insider data available", [], SectionAvailability.unavailable("insider_fetch_failed")`.
- Update the `analyze` docstring sentence "the respective sub-score defaults to a neutral value" to "the respective sub-score keeps its neutral legacy default and its section availability records why".

- [ ] **Step 5: Run focused and full checks**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_enhanced_sentiment_availability.py -v` — Expected: 7 passed.

Run: `.\.venv\Scripts\python.exe -m pytest -q` — Expected: green, 1 xfailed.

- [ ] **Step 6: Commit**

```powershell
git add data-service/app/models/sentiment.py data-service/app/services/enhanced_sentiment_service.py data-service/tests/test_enhanced_sentiment_availability.py
git diff --cached --check
git commit -m "feat(data-service): report enhanced sentiment availability per section"
```

---

## Task 4: Composite Breakdown Availability

**Files:**
- Modify: `data-service/app/models/composite.py:29-36`
- Modify: `data-service/app/services/composite_score_service.py:67-171`
- Test: `data-service/tests/test_composite_score_availability.py`

**Interfaces:**
- Consumes: `SectionAvailability` (Task 1); `EnhancedSentimentResponse.unavailable_components` (Task 3).
- Produces: `CompositeInvestmentScore.breakdown_availability: dict[str, SectionAvailability]` keyed exactly by the eight `CompositeScoreBreakdown` field names; `CompositeInvestmentScore.unavailable_components: list[str]`; module helpers `_factor_score(factor_res, attribute) -> tuple[int, SectionAvailability]`, `_valuation_score(val_res)`, `_earnings_score(earn_res)`, `_sentiment_score(sent_res)` with the same return type.
- Preserves: every breakdown value, `overall_score`, the `< 0.5` confidence cap, `grade`, `recommendation`, `confidence`; PF-1 behavior.

**Acceptance Evidence:**
- `pytest tests/test_composite_score_availability.py -v` → 6 passed.

- [ ] **Step 1: Write the failing tests**

Expected values are worked by hand from `composite_score_service.py` weights: with every input defaulted, `overall = 50·(0.25+0.20+0.15+0.10+0.10+0.10+0.05+0.05) = 50` → grade `C`, recommendation `"Reduce"`. With only sentiment = 70: `47.5 + 0.05·70 = 51` → `C`/`"Reduce"`.

```python
"""CompositeScoreService exposes which breakdown values are real evidence (C0a, PF-1)."""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from app.models.availability import SectionAvailability
from app.models.composite import CompositeScoreBreakdown
from app.models.earnings import EarningsAnalysisResponse, EarningsMetrics
from app.models.factors import FactorAnalysisResponse, FactorScores
from app.models.sentiment import EnhancedSentimentResponse
from app.models.valuation import ValuationGrade, ValuationMetrics, ValuationResponse
from app.services.composite_score_service import CompositeScoreService
from app.services.earnings_analysis_service import EarningsAnalysisService
from app.services.enhanced_sentiment_service import EnhancedSentimentService
from app.services.factor_analysis_service import FactorAnalysisService
from app.services.fundamental_analysis_service import FundamentalAnalysisService
from app.services.risk_analytics_service import RiskAnalyticsService
from app.services.valuation_service import ValuationService

NOW = datetime(2026, 10, 15, tzinfo=timezone.utc)
FIELDS = set(CompositeScoreBreakdown.model_fields)


@pytest.fixture
def components(monkeypatch):
    """Replaces the six analytics services; each wraps provider I/O covered elsewhere."""

    def _install(*, fundamental, valuation, factor, risk, earnings, sentiment):
        def sync(value):
            def method(cls, symbol):
                if isinstance(value, Exception):
                    raise value
                return value
            return classmethod(method)

        def async_(value):
            async def method(cls, symbol):
                if isinstance(value, Exception):
                    raise value
                return value
            return classmethod(method)

        monkeypatch.setattr(FundamentalAnalysisService, "analyze", sync(fundamental))
        monkeypatch.setattr(ValuationService, "analyze", sync(valuation))
        monkeypatch.setattr(FactorAnalysisService, "analyze_factors", sync(factor))
        monkeypatch.setattr(RiskAnalyticsService, "analyze", sync(risk))
        monkeypatch.setattr(EarningsAnalysisService, "analyze", async_(earnings))
        monkeypatch.setattr(EnhancedSentimentService, "analyze", async_(sentiment))

    return _install


def _enhanced(score: int, unavailable: list[str]) -> EnhancedSentimentResponse:
    ok = SectionAvailability.available()
    gap = SectionAvailability.insufficient("no_insider_transactions")
    return EnhancedSentimentResponse(
        symbol="AAPL", news_score=0.2, news_label="BULLISH", analyst_score=0.2, analyst_consensus="Buy",
        insider_score=0.0, insider_summary="No recent insider activity", sentiment_score=score, calculated_at=NOW,
        news_availability=ok, analyst_availability=ok,
        insider_availability=gap if "insider" in unavailable else ok, unavailable_components=unavailable,
    )


def _reasons(result) -> dict[str, str | None]:
    return {field: availability.unavailable_reason for field, availability in result.breakdown_availability.items()}


async def test_all_components_failing_are_unavailable_and_values_unchanged(components):
    boom = RuntimeError("provider down")
    components(fundamental=boom, valuation=boom, factor=boom, risk=boom, earnings=boom, sentiment=boom)

    result = await CompositeScoreService.analyze("AAPL")

    assert result.unavailable_components == ["fundamental", "valuation", "factor", "risk", "earnings", "sentiment"]
    assert set(result.breakdown_availability) == FIELDS
    assert {a.status for a in result.breakdown_availability.values()} == {"unavailable"}
    assert _reasons(result) == {
        "fundamental_score": "derived_from_defaulted_fields",
        "valuation_score": "valuation_component_unavailable",
        "quality_score": "factor_component_unavailable",
        "growth_score": "factor_component_unavailable",
        "momentum_score": "factor_component_unavailable",
        "risk_score": "factor_component_unavailable",
        "earnings_score": "earnings_component_unavailable",
        "sentiment_score": "sentiment_component_unavailable",
    }
    assert set(result.breakdown.model_dump().values()) == {50}
    assert (result.overall_score, result.grade.value, result.recommendation, result.confidence) == (50, "C", "Reduce", 0.0)


async def test_production_shaped_inputs_report_not_mapped_and_keep_values(components):
    components(
        fundamental=SimpleNamespace(),
        valuation=ValuationResponse(symbol="AAPL", metrics=ValuationMetrics(valuation_grade=ValuationGrade.CHEAP), calculated_at=NOW),
        factor=FactorAnalysisResponse(
            symbol="AAPL", scores=FactorScores(quality_score=90, growth_score=80, momentum_score=70, low_volatility_score=60),
            dominant_factor="quality", calculated_at=NOW,
        ),
        risk=SimpleNamespace(),
        earnings=EarningsAnalysisResponse(
            symbol="AAPL",
            metrics=EarningsMetrics(earnings_score=85, beat_ratio=0.75, miss_ratio=0.25, average_surprise_pct=3.0,
                                    consecutive_beats=2, consecutive_misses=0, quarters_analyzed=4),
            history=[], calculated_at=NOW,
        ),
        sentiment=_enhanced(70, []),
    )

    result = await CompositeScoreService.analyze("AAPL")

    assert result.unavailable_components == []
    assert _reasons(result) == {
        "fundamental_score": "derived_from_defaulted_fields",
        "valuation_score": "valuation_grade_not_mapped",
        "quality_score": "factor_score_not_mapped",
        "growth_score": "factor_score_not_mapped",
        "momentum_score": "factor_score_not_mapped",
        "risk_score": "factor_score_not_mapped",
        "earnings_score": "earnings_score_not_mapped",
        "sentiment_score": None,
    }
    breakdown = result.breakdown.model_dump()
    assert breakdown.pop("sentiment_score") == 70
    assert set(breakdown.values()) == {50}
    assert (result.overall_score, result.grade.value, result.recommendation) == (51, "C", "Reduce")


async def test_mapped_shape_reports_available_and_partial_sentiment(components):
    # Shape the composite code expects; production responses nest these values (PF-1).
    components(
        fundamental=SimpleNamespace(), risk=SimpleNamespace(),
        valuation=SimpleNamespace(valuation_grade="Cheap"),
        factor=SimpleNamespace(quality_score=80, growth_score=60, momentum_score=40, low_volatility_score=70),
        earnings=SimpleNamespace(earnings_score=90),
        sentiment=_enhanced(70, ["insider"]),
    )

    result = await CompositeScoreService.analyze("AAPL")

    statuses = {field: availability.status for field, availability in result.breakdown_availability.items()}
    assert statuses.pop("sentiment_score") == "insufficient"
    assert set(statuses.values()) == {"available"}
    assert result.breakdown_availability["sentiment_score"].unavailable_reason == "sentiment_sections_unavailable"
    assert result.breakdown.model_dump() == {
        "fundamental_score": 70, "valuation_score": 75, "quality_score": 80, "growth_score": 60,
        "momentum_score": 40, "risk_score": 70, "earnings_score": 90, "sentiment_score": 70,
    }


@pytest.mark.parametrize(
    ("valuation", "factor", "field", "reason"),
    [
        (SimpleNamespace(valuation_grade="Unknown"), SimpleNamespace(), "valuation_score", "valuation_grade_unrecognized"),
        (SimpleNamespace(valuation_grade=None), SimpleNamespace(), "valuation_score", "valuation_grade_missing"),
        (
            SimpleNamespace(valuation_grade="Fair"),
            SimpleNamespace(quality_score=None, growth_score=60, momentum_score=40, low_volatility_score=70),
            "quality_score",
            "factor_score_missing",
        ),
    ],
)
async def test_present_but_empty_values_are_insufficient(components, valuation, factor, field, reason):
    components(fundamental=SimpleNamespace(), risk=SimpleNamespace(), valuation=valuation, factor=factor,
               earnings=SimpleNamespace(earnings_score=None), sentiment=_enhanced(50, []))

    result = await CompositeScoreService.analyze("AAPL")

    assert result.breakdown_availability[field].model_dump() == {"status": "insufficient", "unavailable_reason": reason}
    assert result.breakdown_availability["earnings_score"].unavailable_reason == "earnings_score_missing"
    assert getattr(result.breakdown, field) == 50
```

- [ ] **Step 2: Run them and confirm failure**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_composite_score_availability.py -v`

Expected: 6 FAIL — `AttributeError: 'CompositeInvestmentScore' object has no attribute 'unavailable_components'` / `breakdown_availability`.

- [ ] **Step 3: Add the fields to `CompositeInvestmentScore`**

In `app/models/composite.py` import `SectionAvailability` and append:

```python
    calculated_at: datetime
    breakdown_availability: dict[str, SectionAvailability]
    unavailable_components: list[str]
```

- [ ] **Step 4: Replace the scoring block in `CompositeScoreService.analyze`**

Add the import and module-level helpers above the class:

```python
from app.models.availability import SectionAvailability

_LEGACY_NEUTRAL = 50  # legacy default kept by C0a; availability says it is not evidence
_VALUATION_GRADE_SCORES = (("VERY CHEAP", 95), ("CHEAP", 75), ("FAIR", 50), ("VERY EXPENSIVE", 5), ("EXPENSIVE", 25))


def _missing(result) -> bool:
    return result is None or isinstance(result, Exception)


def _factor_score(factor_res, attribute: str) -> tuple[int, SectionAvailability]:
    if _missing(factor_res):
        return _LEGACY_NEUTRAL, SectionAvailability.unavailable("factor_component_unavailable")
    if not hasattr(factor_res, attribute):
        return _LEGACY_NEUTRAL, SectionAvailability.unavailable("factor_score_not_mapped")
    value = getattr(factor_res, attribute)
    if value is None:
        return _LEGACY_NEUTRAL, SectionAvailability.insufficient("factor_score_missing")
    return int(value), SectionAvailability.available()


def _valuation_score(val_res) -> tuple[int, SectionAvailability]:
    if _missing(val_res):
        return _LEGACY_NEUTRAL, SectionAvailability.unavailable("valuation_component_unavailable")
    if not hasattr(val_res, "valuation_grade"):
        return _LEGACY_NEUTRAL, SectionAvailability.unavailable("valuation_grade_not_mapped")
    if val_res.valuation_grade is None:
        return _LEGACY_NEUTRAL, SectionAvailability.insufficient("valuation_grade_missing")
    grade_str = getattr(val_res.valuation_grade, "value", str(val_res.valuation_grade)).upper()
    for keyword, score in _VALUATION_GRADE_SCORES:
        if keyword in grade_str:
            return score, SectionAvailability.available()
    return _LEGACY_NEUTRAL, SectionAvailability.insufficient("valuation_grade_unrecognized")


def _earnings_score(earn_res) -> tuple[int, SectionAvailability]:
    if _missing(earn_res):
        return _LEGACY_NEUTRAL, SectionAvailability.unavailable("earnings_component_unavailable")
    if not hasattr(earn_res, "earnings_score"):
        return _LEGACY_NEUTRAL, SectionAvailability.unavailable("earnings_score_not_mapped")
    if earn_res.earnings_score is None:
        return _LEGACY_NEUTRAL, SectionAvailability.insufficient("earnings_score_missing")
    return int(earn_res.earnings_score), SectionAvailability.available()


def _sentiment_score(sent_res) -> tuple[int, SectionAvailability]:
    if _missing(sent_res):
        return _LEGACY_NEUTRAL, SectionAvailability.unavailable("sentiment_component_unavailable")
    if not hasattr(sent_res, "sentiment_score"):
        return _LEGACY_NEUTRAL, SectionAvailability.unavailable("sentiment_score_not_mapped")
    if sent_res.sentiment_score is None:
        return _LEGACY_NEUTRAL, SectionAvailability.insufficient("sentiment_score_missing")
    score = int(sent_res.sentiment_score)
    if getattr(sent_res, "unavailable_components", []):
        return score, SectionAvailability.insufficient("sentiment_sections_unavailable")
    return score, SectionAvailability.available()
```

The `("VERY CHEAP", …)` before `("CHEAP", …)` and `("VERY EXPENSIVE", …)` before `("EXPENSIVE", …)` order reproduces the original `elif` chain. In `analyze`, replace lines 67-112 (from `fund_res, val_res, …` through the sentiment block) with:

```python
        fund_res, val_res, factor_res, risk_res, earn_res, sent_res = results
        fetched = {
            "fundamental": fund_res, "valuation": val_res, "factor": factor_res,
            "risk": risk_res, "earnings": earn_res, "sentiment": sent_res,
        }
        unavailable_components = [name for name, result in fetched.items() if _missing(result)]

        success_count = sum(1 for r in results if r is not None and not isinstance(r, Exception))
        total_calls = 6
        confidence = success_count / total_calls if total_calls > 0 else 0.0

        quality_score, quality_availability = _factor_score(factor_res, "quality_score")
        growth_score, growth_availability = _factor_score(factor_res, "growth_score")
        momentum_score, momentum_availability = _factor_score(factor_res, "momentum_score")
        risk_score, risk_availability = _factor_score(factor_res, "low_volatility_score")

        fundamental_score = (quality_score + growth_score) // 2
        if quality_availability.status == "available" and growth_availability.status == "available":
            fundamental_availability = SectionAvailability.available()
        else:
            fundamental_availability = SectionAvailability.unavailable("derived_from_defaulted_fields")

        valuation_score, valuation_availability = _valuation_score(val_res)
        earnings_score, earnings_availability = _earnings_score(earn_res)
        sentiment_score, sentiment_availability = _sentiment_score(sent_res)
```

Leave the `overall_float`, confidence cap, grade chain, and `breakdown = …` unchanged. Extend the final constructor:

```python
        return CompositeInvestmentScore(
            symbol=symbol,
            overall_score=overall_score,
            grade=grade,
            recommendation=recommendation,
            breakdown=breakdown,
            confidence=confidence,
            calculated_at=datetime.now(timezone.utc),
            breakdown_availability={
                "fundamental_score": fundamental_availability,
                "valuation_score": valuation_availability,
                "quality_score": quality_availability,
                "growth_score": growth_availability,
                "momentum_score": momentum_availability,
                "risk_score": risk_availability,
                "earnings_score": earnings_availability,
                "sentiment_score": sentiment_availability,
            },
            unavailable_components=unavailable_components,
        )
```

- [ ] **Step 5: Run focused and full checks**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_composite_score_availability.py tests/test_research_endpoints.py -v` — Expected: all passed.

Run: `.\.venv\Scripts\python.exe -m pytest -q` — Expected: green, 1 xfailed.

- [ ] **Step 6: Commit**

```powershell
git add data-service/app/models/composite.py data-service/app/services/composite_score_service.py data-service/tests/test_composite_score_availability.py
git diff --cached --check
git commit -m "feat(data-service): expose composite breakdown availability"
```

---

## Task 5: Agent Decision Availability

**Files:**
- Modify: `data-service/app/agents/portfolio_manager.py`
- Modify: `data-service/app/models/agent_analysis.py:13-22`
- Modify: `data-service/app/trading_agents/metrics_trading_graph.py:85-99`
- Modify: `data-service/tests/test_agents.py` (append)
- Modify: `data-service/tests/test_metrics_trading_graph.py` (one assertion)
- Modify: `data-service/tests/test_agent_analysis_endpoint.py:29-39`

**Interfaces:**
- Consumes: `SectionAvailability` (Task 1).
- Produces:

  ```python
  @dataclass(frozen=True)
  class PortfolioManagerVerdict:
      decision: str
      confidence: int
      reasoning: str
      token_usage: int
      availability: SectionAvailability

  def run_portfolio_manager_verdict(llm: BaseChatModel, ticker: str, debate_context: str) -> PortfolioManagerVerdict
  ```

  `AgentAnalysisResponse.decision_availability: SectionAvailability`.
- Preserves: `run_portfolio_manager(...) -> tuple[str, str, int, int]`; `_parse_pm_response(text) -> tuple[str, int, str]` values; sequential analyst order; `decision`/`confidence` on the wire.

**Acceptance Evidence:**
- `pytest tests/test_agents.py tests/test_metrics_trading_graph.py tests/test_agent_analysis_endpoint.py -v` → all passed, including 5 new verdict tests.

- [ ] **Step 1: Append the failing tests to `tests/test_agents.py`**

Change the existing import line to `from app.agents.portfolio_manager import run_portfolio_manager, run_portfolio_manager_verdict`, then append:

```python
def test_json_verdict_is_available(mock_llm):
    mock_llm.invoke.return_value = create_mock_response('{"decision": "buy", "confidence": 85, "reasoning": "ok"}', 7)
    verdict = run_portfolio_manager_verdict(mock_llm, "AAPL", "Debate context")

    assert (verdict.decision, verdict.confidence, verdict.reasoning, verdict.token_usage) == ("BUY", 85, "ok", 7)
    assert verdict.availability.model_dump() == {"status": "available", "unavailable_reason": None}


def test_keyword_fallback_is_unparseable(mock_llm):
    mock_llm.invoke.return_value = create_mock_response("We should SELL this stock now.", 9)
    verdict = run_portfolio_manager_verdict(mock_llm, "AAPL", "Debate context")

    assert (verdict.decision, verdict.confidence) == ("SELL", 70)
    assert verdict.availability.model_dump() == {"status": "unparseable", "unavailable_reason": "pm_response_not_json_keyword_fallback"}


def test_default_hold_is_unparseable(mock_llm):
    mock_llm.invoke.return_value = create_mock_response("Neither option makes sense.", 9)
    verdict = run_portfolio_manager_verdict(mock_llm, "AAPL", "Debate context")

    assert (verdict.decision, verdict.confidence) == ("HOLD", 50)
    assert verdict.availability.unavailable_reason == "pm_response_not_json_default_hold"


def test_json_with_invalid_decision_is_unparseable(mock_llm):
    mock_llm.invoke.return_value = create_mock_response('{"decision": "STRONG BUY", "confidence": 90}', 9)
    verdict = run_portfolio_manager_verdict(mock_llm, "AAPL", "Debate context")

    assert (verdict.decision, verdict.confidence) == ("STRONG BUY", 90)
    assert verdict.availability.unavailable_reason == "pm_json_missing_or_invalid_fields"


def test_json_without_confidence_is_unparseable(mock_llm):
    mock_llm.invoke.return_value = create_mock_response('{"decision": "HOLD", "reasoning": "wait"}', 9)
    verdict = run_portfolio_manager_verdict(mock_llm, "AAPL", "Debate context")

    assert (verdict.decision, verdict.confidence) == ("HOLD", 50)
    assert verdict.availability.unavailable_reason == "pm_json_missing_or_invalid_fields"
```

- [ ] **Step 2: Run them and confirm failure**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_agents.py -v`

Expected: collection error `ImportError: cannot import name 'run_portfolio_manager_verdict'`.

- [ ] **Step 3: Rewrite `app/agents/portfolio_manager.py`**

```python
from __future__ import annotations

import json
import re
from dataclasses import dataclass

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.language_models.chat_models import BaseChatModel

from app.models.availability import SectionAvailability

_VALID_DECISIONS = frozenset({"BUY", "HOLD", "SELL"})


@dataclass(frozen=True)
class PortfolioManagerVerdict:
    decision: str
    confidence: int
    reasoning: str
    token_usage: int
    availability: SectionAvailability


def run_portfolio_manager_verdict(
    llm: BaseChatModel, ticker: str, debate_context: str
) -> PortfolioManagerVerdict:
    messages = [
        SystemMessage(
            content=(
                "You are the Portfolio Manager. Use ONLY the provided debate context. "
                "Never fetch external data or tools. "
                "Respond in JSON: {\"decision\":\"BUY|HOLD|SELL\",\"confidence\":0-100,\"reasoning\":\"...\"}"
            )
        ),
        HumanMessage(content=f"Ticker: {ticker}\nDebate:\n{debate_context}"),
    ]
    response = llm.invoke(messages)
    text = (getattr(response, "content", str(response)) or "").strip()
    decision, confidence, reasoning, availability = _parse_pm_response_with_availability(text)
    return PortfolioManagerVerdict(decision, confidence, reasoning, _tokens(response), availability)


def run_portfolio_manager(
    llm: BaseChatModel, ticker: str, debate_context: str
) -> tuple[str, str, int, int]:
    """Returns decision, reasoning, confidence, token_usage."""
    verdict = run_portfolio_manager_verdict(llm, ticker, debate_context)
    return verdict.decision, verdict.reasoning, verdict.confidence, verdict.token_usage


def _parse_pm_response(text: str) -> tuple[str, int, str]:
    decision, confidence, reasoning, _ = _parse_pm_response_with_availability(text)
    return decision, confidence, reasoning


def _parse_pm_response_with_availability(text: str) -> tuple[str, int, str, SectionAvailability]:
    try:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            data = json.loads(match.group())
            decision = str(data.get("decision", "HOLD")).upper()
            confidence = int(data.get("confidence", 50))
            reasoning = str(data.get("reasoning", text))
            complete = "decision" in data and decision in _VALID_DECISIONS and "confidence" in data
            availability = (
                SectionAvailability.available()
                if complete
                else SectionAvailability.unparseable("pm_json_missing_or_invalid_fields")
            )
            return decision, max(0, min(100, confidence)), reasoning, availability
    except (json.JSONDecodeError, ValueError, TypeError):
        pass
    upper = text.upper()
    if "BUY" in upper and "SELL" not in upper:
        return "BUY", 70, text, SectionAvailability.unparseable("pm_response_not_json_keyword_fallback")
    if "SELL" in upper:
        return "SELL", 70, text, SectionAvailability.unparseable("pm_response_not_json_keyword_fallback")
    return "HOLD", 50, text, SectionAvailability.unparseable("pm_response_not_json_default_hold")


def _tokens(response) -> int:
    meta = getattr(response, "response_metadata", None) or {}
    usage = meta.get("token_usage") or meta.get("usage") or {}
    return int(usage.get("total_tokens", 0)) if isinstance(usage, dict) else 0
```

- [ ] **Step 4: Add the response field and use the verdict in the graph**

`app/models/agent_analysis.py`: import `SectionAvailability` and append `decision_availability: SectionAvailability` after `token_usage`.

`app/trading_agents/metrics_trading_graph.py`: change the import to `from app.agents.portfolio_manager import run_portfolio_manager_verdict` and replace lines 85-99 with:

```python
            verdict = run_portfolio_manager_verdict(llm, ticker, debate)
            total_tokens += verdict.token_usage

            AGENT_TOKEN_USAGE.inc(total_tokens)
            return AgentAnalysisResponse(
                decision=verdict.decision,
                confidence=verdict.confidence,
                fundamental_summary=fundamental,
                technical_summary=technical,
                risk_summary=risk,
                bull_case=bull,
                bear_case=bear,
                portfolio_manager_reasoning=verdict.reasoning,
                token_usage=total_tokens,
                decision_availability=verdict.availability,
            )
```

- [ ] **Step 5: Update the two existing tests that touch the response**

`tests/test_agent_analysis_endpoint.py`: import `SectionAvailability` and add `decision_availability=SectionAvailability.available(),` to the `fake = AgentAnalysisResponse(...)` call; append `assert body["decision_availability"] == {"status": "available", "unavailable_reason": None}` at the end of that test.

`tests/test_metrics_trading_graph.py`: the scripted sixth response in `test_metrics_trading_graph_propagate` is valid JSON with `"decision": "BUY"` and `"confidence": 80`, so after `assert response.confidence == 80` add `assert response.decision_availability.status == "available"`. Do not change the scripted response.

- [ ] **Step 6: Run focused and full checks**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_agents.py tests/test_metrics_trading_graph.py tests/test_agent_analysis_endpoint.py -v` — Expected: all passed; the four original `run_portfolio_manager` tests pass unchanged.

Run: `.\.venv\Scripts\python.exe -m pytest -q` — Expected: green, 1 xfailed.

- [ ] **Step 7: Commit**

```powershell
git add data-service/app/agents/portfolio_manager.py data-service/app/models/agent_analysis.py data-service/app/trading_agents/metrics_trading_graph.py data-service/tests/test_agents.py data-service/tests/test_metrics_trading_graph.py data-service/tests/test_agent_analysis_endpoint.py
git diff --cached --check
git commit -m "feat(data-service): mark keyword-parsed agent decisions unparseable"
```

---

## Task 6: Spring Consumers Tolerate the Additive Fields (test-only)

**Files:**
- Test: `backend/src/test/java/com/ozkaslibasar/financeproject/adapter/outbound/client/dataservice/DataServiceC0aCompatibilityTest.java`
- Verify (read only): `DataServiceAgentAnalysisAdapter.java`, `DataServiceResearchAdapter.java`, `LlmInsightAdapter.java`, `config/WebConfig.java:33-45`

**Interfaces:**
- Consumes: wire shapes from Tasks 2, 4, 5.
- Produces: proof that `DataServiceAgentAnalysisAdapter.runAnalysis`, `DataServiceResearchAdapter.fetchCompositeScore`, `LlmInsightAdapter.getSentiment`, and `LlmInsightAdapter.getFullAnalysis` return populated results with the new fields present.
- Preserves: all backend production code (test-only task; no file under `backend/src/main` changes).

**Acceptance Evidence:**
- `.\mvnw.cmd -q test -Dtest=DataServiceC0aCompatibilityTest` → 4 tests, 0 failures.

- [ ] **Step 1: Write the tests**

Construct each adapter with `new RestTemplate()` (the same construction `WebConfig.restTemplate()` uses) bound to `MockRestServiceServer`, set `baseUrl` with `ReflectionTestUtils.setField(adapter, "baseUrl", "http://data-service.test")`, follow `DataServicePriceAdapterTest` style. `LlmInsightAdapter` takes `(RestTemplate, ObjectMapper)`; pass `new ObjectMapper()`. `DataServiceAgentAnalysisAdapter` takes `(RestTemplate, MeterRegistry)`; pass `new SimpleMeterRegistry()`.

| Test | Request expectation | JSON body (abbreviated keys must be present) | Assertion |
|---|---|---|---|
| `agentAnalysisIgnoresDecisionAvailability` | `POST http://data-service.test/api/v1/agent-analysis` | all nine legacy fields with `"decision":"SELL","confidence":70` plus `"decision_availability":{"status":"unparseable","unavailable_reason":"pm_response_not_json_keyword_fallback"}` | result present; `decision()` is `"SELL"`; `confidence()` is `70` |
| `compositeIgnoresBreakdownAvailability` | `GET http://data-service.test/api/v1/research/composite/AAPL` | legacy fields plus `"breakdown_availability":{"quality_score":{"status":"unavailable","unavailable_reason":"factor_score_not_mapped"}}` and `"unavailable_components":["risk"]` | result present; `overallScore()` is `51`; `recommendation()` is `"Reduce"` |
| `sentimentIgnoresAvailability` | `GET http://data-service.test/api/v1/sentiment/AAPL` | `symbol, score 0.0, label "NEUTRAL", article_count 0` plus `"availability":{"status":"insufficient","unavailable_reason":"no_articles_in_lookback"}` | result present; `score()` is `0.0` |
| `fullAnalysisIgnoresNestedSentimentAvailability` | `GET` the URL `LlmInsightAdapter.getFullAnalysis("AAPL")` builds (read it from the adapter source) | `"sentiment"` object carrying the same `availability` | result present; sentiment label `"NEUTRAL"` |

Call `adapter.runAnalysis("AAPL", metrics, null)` with an `AgentMetricSnapshot` built from the record's canonical constructor using `BigDecimal.valueOf(150)` as price and empty maps; read `AgentMetricSnapshot.java` for the argument order.

- [ ] **Step 2: Run and record the result**

Run (from `backend/`): `.\mvnw.cmd -q test -Dtest=DataServiceC0aCompatibilityTest`

Expected: 4 tests pass with no production change, confirming the `Jackson2ObjectMapperBuilder` default. If any test fails, this is a genuine compatibility defect: do not edit production code and do not loosen the test; append one JSON line per failure to `test-results/bugs-found-backend.jsonl` using the contract in `docs/agent/verification.md`, stop, and report to the owner — Tasks 2–5 are then not consumer-safe.

- [ ] **Step 3: Run the backend suite**

Run: `.\mvnw.cmd test` — Expected: `BUILD SUCCESS`; report any Testcontainers classes skipped because Docker was unavailable.

- [ ] **Step 4: Commit**

```powershell
git add backend/src/test/java/com/ozkaslibasar/financeproject/adapter/outbound/client/dataservice/DataServiceC0aCompatibilityTest.java
git diff --cached --check
git commit -m "test(backend): prove data-service adapters tolerate availability fields"
```

---

## Task 7: Contracts and C0b Compatibility Matrix

**Files:**
- Modify: `docs/spec/current-system/contracts.md` (Data-Service API rows for sentiment, agent analysis, composite; note below the table)
- Create: `docs/product/evidence/c0b-compatibility-matrix.md`

**Interfaces:**
- Consumes: Tasks 1–6; PF-1, PF-2 from the plan set index.
- Produces: the D-2/OQ-5 input matrix (spec §5 C0b: "source field → each consumer → disposition").
- Preserves: all unrelated contract rows; existing evidence files are not rewritten.

**Acceptance Evidence:**
- `rg -n "SectionAvailability|unavailable_reason" docs/spec/current-system/contracts.md` prints the new note.
- `rg -c "^\| " docs/product/evidence/c0b-compatibility-matrix.md` ≥ 14.

- [ ] **Step 1: Gate — confirm both artifacts are absent**

Run: `rg -n "unavailable_reason" docs/spec/current-system/contracts.md; Test-Path docs/product/evidence/c0b-compatibility-matrix.md`

Expected: no match, then `False`.

- [ ] **Step 2: Edit `contracts.md`**

Change three Data-Service API row purposes:

- Sentiment: `Sentiment analysis; dependency failures are explicit; availability reports insufficient (no articles) or unparseable (LLM output) while score/label keep legacy neutral values`
- Agent analysis: `Metrics-only sequential multi-agent analysis; decision_availability marks keyword-parsed or incomplete decisions as unparseable`
- Composite: `Composite investment score; breakdown_availability and unavailable_components identify defaulted values (legacy 50)`

Below the existing research-status paragraph add:

```markdown
Availability fields (C0a) are additive. Each is `{"status": "available" |
"unavailable" | "insufficient" | "unparseable", "unavailable_reason": <snake_case
code> | null}`. A non-`available` status means the adjacent legacy numeric or
label value is a historical default, not evidence. Spring adapters currently
ignore these fields; consumer migration is C0b (see
`docs/product/evidence/c0b-compatibility-matrix.md`).
```

- [ ] **Step 3: Create the matrix**

Header block: title `# C0b Compatibility Matrix`, `Evidence commit:` the `git rev-parse --short HEAD` value after Task 6, `Date:`, `Feeds: D-2 (spec §7), OQ-5 (PRD §7.4)`, and one paragraph stating that dispositions below are candidates, not decisions.

Then one table with columns `Source route` | `Field` | `Legacy value on failure` | `New availability signal` | `Spring consumer chain` | `React consumer` | `Persistence` | `Candidate dispositions` | `Evidence refs`, and at least these rows (verify each consumer with the `rg` command in the last column of the table below before writing it):

| Source route | Field | Spring chain to verify | Verify with |
|---|---|---|---|
| `GET /api/v1/sentiment/{symbol}` | `score`, `label` | `LlmInsightAdapter.getSentiment` → `LlmInsightPort.SentimentResult` → (no caller outside adapter on 2026-10-15) | `rg -n "getSentiment\(" backend/src/main` |
| `GET /api/v1/full/{symbol}` | `sentiment.score`, `sentiment.label` | `LlmInsightAdapter.getFullAnalysis` → `FullAnalysisResult.SentimentData` → (no caller outside adapter on 2026-10-15) | `rg -n "getFullAnalysis\(" backend/src/main` |
| `GET /api/v1/research/composite/{symbol}` | each of the 8 `breakdown.*` fields (one row each or one grouped row naming all 8) | `DataServiceResearchAdapter.fetchCompositeScore` → `SmartReportScorePort.CompositeScore` → `SmartReportUseCase` → `SmartReport` → `SmartReportController` | `rg -n "fetchCompositeScore\|CompositeScore" backend/src/main` |
| 〃 | `overall_score`, `grade`, `recommendation` | same chain; React `useSmartReport.ts`, `AiReportsView.tsx:263-266`, `StockDetailModal.tsx:185` | `rg -n "recommendation\|overallScore" frontend/src --glob '!*.test.*'` |
| 〃 | `confidence` | same chain | `rg -n "confidence" backend/src/main/java/com/ozkaslibasar/financeproject/domain/model/SmartReport.java` |
| `POST /api/v1/agent-analysis` | `decision`, `confidence` | `DataServiceAgentAnalysisAdapter` → `AgentAnalysisResult` → `AgentAnalysisCacheService` (Redis) and `AgentAnalysisHistoryAdapter` → `agent_analysis_history.decision VARCHAR(16) NOT NULL`, `confidence INTEGER NOT NULL` (V2) → `AgentAnalysisController`; React `useAgentAnalysis.ts` has no component consumer (PF-2) | `rg -n "AgentAnalysisResult" backend/src/main`; `rg -l useAgentAnalysis frontend/src --glob '*.tsx'` |
| internal `EnhancedSentimentResponse` | `news_score`, `analyst_score`, `insider_score`, `sentiment_score` | not on the wire; feeds composite `sentiment_score` and the `LlmInsightService` prompt | `rg -n "EnhancedSentimentService" data-service/app` |
| internal composite → `LlmInsightService._build_context_prompt` | `overall_score`, `grade`, `recommendation`, breakdown | defaulted values are written into the Azure prompt | `rg -n "COMPOSITE SCORE" data-service/app/services/llm_insight_service.py` |

Candidate dispositions per row use the OQ-5 vocabulary `preserve | version | coordinated-migration | retire`. Record at least: composite `recommendation` → `retire` or `rename` per PRD §3.4; agent `decision` from keyword fallback → `coordinated-migration` (stop emitting `BUY`/`SELL`; persistence column is `NOT NULL`, so a migration or an explicit `UNPARSEABLE` value is required); sentiment `score` → `coordinated-migration` to nullable (no live Spring caller found). Evidence refs cite `CAP-CUR-DS-005`, `CAP-CUR-DS-006`, `CAP-CUR-XR-003`, `CAP-CUR-XR-007`, `CAP-CUR-FE-006`, `DOC-CONFLICT-008`, `DOC-CONFLICT-009`, PF-1, PF-2 as applicable.

Close with a section `## All-consumer test plan for C0b` listing, per runtime, the test class or file that must change with each disposition (data-service: the four Task 2–5 test files; backend: `DataServiceC0aCompatibilityTest` plus the adapter/use-case tests that `rg` finds; frontend: `hooks.test.tsx` and component tests for `AiReportsView`, `StockDetailModal`).

- [ ] **Step 4: Verify and commit**

Run: `rg -n "unavailable_reason" docs/spec/current-system/contracts.md` — Expected: one match. Run: `rg -c "^\| " docs/product/evidence/c0b-compatibility-matrix.md` — Expected: ≥ 14.

```powershell
git add docs/spec/current-system/contracts.md docs/product/evidence/c0b-compatibility-matrix.md
git diff --cached --check
git commit -m "docs(spec): document C0a availability fields and C0b matrix"
```

---

## Plan Exit Criteria

- [ ] Every task has its own focused verification evidence.
- [ ] `SectionAvailability`, `PortfolioManagerVerdict`, `run_portfolio_manager_verdict`, and every field in **Produces** exist with the exact names.
- [ ] Data-service full suite green with 1 xfailed — baseline + 33 tests (planning run on a scratch copy with this plan applied: `161 passed, 1 xfailed` from a `128 passed` baseline); fresh output in the PR.
- [ ] Backend `.\mvnw.cmd test` green; frontend `npm run lint`, `npm run test:coverage`, `npm run build` green with no frontend file changed (spec §9 "existing suites run unchanged").
- [ ] Smoke S3 (news degradation) and S6 (agent-analysis cache) pass, or are reported as not run with the reason.
- [ ] No reason string in the codebase contains anything but `[a-z0-9_]`: `rg -n "SectionAvailability\.(unavailable|insufficient|unparseable)\(\"[^\"]*[^a-z0-9_\"]" data-service/app` prints nothing.
- [ ] Unrelated user changes remain unstaged and unmodified.

## Handoff to Plan 2

Plan 2 does not consume Plan 1. Carried forward to C0b and the owner:

- Inputs made available: `c0b-compatibility-matrix.md`; availability fields on four responses; `wire_async_client` fixture for future Finnhub/Azure tests.
- Conditions later work may assume: a non-`available` status always accompanies a legacy default; Spring ignores the new fields.
- Open risks carried forward:
  - PF-1 composite paths — owner decision D-6.
  - `SentimentService` raises `AttributeError` (route 503 with `str(e)` in detail) when the LLM returns a JSON array or scalar; the 503 detail also echoes raw exception text. Owner: C0b / follow-up `fix(data-service)`.
  - `LlmInsightService` still writes defaulted composite values into the Azure prompt without their availability. Owner: EPIC-006.

## Self-Review

**Spec coverage:** P1.1 sites — `sentiment_service.py` L44-47, L131-137 (Task 2); `enhanced_sentiment_service.py` L79, L100, L130, L140 plus insider L176, L226 (Task 3; insider added because it is the same fabrication pattern in the same response); `composite_score_service.py` L74-110 (Task 4); `portfolio_manager.py` L37-46 (Task 5). "Composite responses list which components were unavailable" → `unavailable_components` (Task 4). Spec §9 contract tests on unchanged field types → value-preservation assertions in Tasks 2–5 and Task 6. C0b matrix → Task 7. C0b implementation is out of scope.

**Step scan:** Every code step shows code; Task 6 specifies each request, body, and assertion; Task 7 lists every row and its verification command.

**Type and name consistency:** `SectionAvailability` factories are used identically in Tasks 2–5; enhanced sentiment's `unavailable_components` (Task 3) is what `_sentiment_score` reads (Task 4); `verdict.availability` (Task 5) feeds `decision_availability`; reason codes in tests equal the Locked Decisions table.

**Review focus:** All five items map to named tests.

**Proportion:** Additive fields and tests; no value, status, route, or consumer change.
