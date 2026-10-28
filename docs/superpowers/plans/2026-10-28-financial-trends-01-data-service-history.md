# Data-Service Financial History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose a read-only, multi-year, null-preserving statement history so the backend can derive trend ratios without any invented value.

**Architecture:** A new `FinancialHistoryService` reads yfinance `financials`, `balance_sheet` and `cashflow` directly (ADR-0006 D2 exception, same as `FundamentalAnalysisService`), aligns the three frames by fiscal-year-end date, and returns parallel lists with `None` for any missing value. One new route on the existing research router.

**Tech Stack:** FastAPI, pydantic, pandas, yfinance, pytest (no live provider calls: `yf.Ticker` is replaced by a fake).

**Spec:** `docs/product/decisions/2026-10-28-financial-trend-charts.md` (decisions 1-3, 10, 12); `docs/spec/current-system/contracts.md` (research routes, ~line 151).

## Global Constraints

- Work on a task branch off `main`, e.g. `git worktree add ../finance-project-fh-ds -b feat/financial-history-data-service main`. The `fp-approve` checkout has unrelated uncommitted changes; leave them untouched.
- Route path is exactly `GET /api/v1/research/financial-history/{symbol}`. Existing routes, models and `YahooProvider._extract_series` are not modified.
- Wire field names are snake_case: `symbol`, `status`, `currency`, `period_type`, `fiscal_year_ends`, `series`, `retrieved_at`.
- `status` is one of `AVAILABLE`, `PARTIAL`, `EMPTY`. `period_type` is always `"annual"`.
- `fiscal_year_ends` is `YYYY-MM-DD`, **ascending** (oldest first). Every list in `series` has the same length as `fiscal_year_ends`.
- `series` keys, in this order: `revenue`, `net_income`, `operating_cash_flow`, `capital_expenditure`, `total_assets`, `total_liabilities`, `total_equity`, `total_debt`, `cash`, `current_assets`, `current_liabilities`.
- Row names (strict, first match wins, no other fallback): revenue `Total Revenue`; net_income `Net Income`, `Net Income Common Stockholders`; operating_cash_flow `Operating Cash Flow`, `Total Cash From Operating Activities`; capital_expenditure `Capital Expenditure`, `Capital Expenditures` (stored as absolute value); total_assets `Total Assets`; total_liabilities `Total Liabilities Net Minority Interest`, `Total Liab`; total_equity `Stockholders Equity`, `Total Stockholder Equity`; total_debt `Total Debt`; cash `Cash And Cash Equivalents`; current_assets `Current Assets`, `Total Current Assets`; current_liabilities `Current Liabilities`, `Total Current Liabilities`.
- Missing, NaN and non-finite values become `None`, never `0.0`. No scaling, no currency conversion.
- Currency is `info["financialCurrency"]`, else `info["currency"]`, else `None`.
- Never call a live provider from tests. Run checks via `node ../scripts/run-with-timeout.cjs 120000 python -m pytest <target> -q` from `data-service/`.
- Conventional Commits, scope `data-service` / `spec`; end each commit with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- A NaN cell must come back `None` and flip `status` to `PARTIAL`, not become `0.0`.
- A year present in only one frame (for example cashflow has an older column) keeps its date, with `None` in the other frames' series.
- yfinance returns columns newest-first; the response must be oldest-first with every series reversed together.
- `Capital Expenditure` is reported negative by yfinance; the response carries the positive magnitude.
- One frame raising on access counts as empty for that frame; all three raising is `DependencyUnavailableError` (HTTP 503), not an `EMPTY` 200.
- An unknown symbol (all frames empty) is `EMPTY` with empty lists, never a 500.

---

### Task 1: Response model and service

**Files:**
- Create: `data-service/app/models/financial_history.py`
- Create: `data-service/app/services/financial_history_service.py`
- Test: `data-service/tests/test_financial_history_service.py`

**Interfaces:**
- Produces: `class FinancialHistoryResponse(BaseModel)` with `symbol: str`, `status: Literal["AVAILABLE","PARTIAL","EMPTY"]`, `currency: Optional[str]`, `period_type: Literal["annual"] = "annual"`, `fiscal_year_ends: list[str]`, `series: dict[str, list[Optional[float]]]`, `retrieved_at: datetime`; module constant `SERIES_KEYS: tuple[str, ...]` in the order above.
- Produces: `FinancialHistoryService.get(symbol: str) -> FinancialHistoryResponse` (classmethod); raises `app.errors.DependencyUnavailableError` when all three statement reads raise.

- [ ] **Step 1: Write the failing tests** in `test_financial_history_service.py`. Build a `FakeTicker` (class with `financials`, `balance_sheet`, `cashflow` DataFrames or exceptions, and `info` dict) and monkeypatch `app.services.financial_history_service.yf.Ticker` to return it. DataFrames have row labels as index and `pd.Timestamp` fiscal-year-end columns, newest first. Tests, with these assertions:
  - `test_aligns_series_ascending_by_fiscal_year_end`: columns `2024-09-28`, `2023-09-30`, revenue `[391.0, 383.0]` → `fiscal_year_ends == ["2023-09-30", "2024-09-28"]`, `series["revenue"] == [383.0, 391.0]`, `status == "AVAILABLE"` when every series is full.
  - `test_nan_cell_is_none_and_status_partial`: one NaN net income → that slot `is None`, `status == "PARTIAL"`.
  - `test_series_absent_from_frame_is_all_none`: empty `balance_sheet` → `series["total_equity"] == [None, None]`, revenue intact, `PARTIAL`.
  - `test_year_in_only_one_frame_is_kept`: cashflow has extra `2022-09-24` → that date is first in `fiscal_year_ends`, `series["revenue"][0] is None`, `series["operating_cash_flow"][0]` is the cashflow value.
  - `test_capital_expenditure_is_positive_magnitude`: input `-10.0` → `10.0`.
  - `test_total_debt_has_no_long_term_debt_fallback`: only `Long Term Debt` row present → `series["total_debt"]` all `None`.
  - `test_infinite_value_is_none`.
  - `test_all_frames_empty_is_empty_status`: `status == "EMPTY"`, `fiscal_year_ends == []`, every `SERIES_KEYS` key maps to `[]`.
  - `test_one_frame_raising_is_treated_as_empty`: `cashflow` raises → still returns, operating cash flow all `None`.
  - `test_all_frames_raising_is_dependency_unavailable`: `pytest.raises(DependencyUnavailableError)`.
  - `test_currency_prefers_financial_currency`: `info={"financialCurrency":"TWD","currency":"USD"}` → `"TWD"`; neither key → `None`; `info` raising → `None`.
  - `test_symbol_is_uppercased`.
- [ ] **Step 2: Run to verify failure.** `node ../scripts/run-with-timeout.cjs 120000 python -m pytest tests/test_financial_history_service.py -q` → FAIL (`ModuleNotFoundError: app.services.financial_history_service`).
- [ ] **Step 3: Implement** the model and `FinancialHistoryService.get`. Approach: read each frame in its own `try/except` (count failures); the date axis is the sorted union of all column labels converted with `pd.Timestamp(label).date().isoformat()`; per series, look the value up by label, `None` when the row or column is absent or the value is not finite; reverse nothing by hand, sort ascending by date. Status: `EMPTY` if the date axis is empty, `PARTIAL` if any series value is `None`, else `AVAILABLE`.
- [ ] **Step 4: Run to verify pass.** Same command → all PASS.
- [ ] **Step 5: Commit.** `git add data-service/app/models/financial_history.py data-service/app/services/financial_history_service.py data-service/tests/test_financial_history_service.py` → `feat(data-service): add null-preserving multi-year financial history service`.

### Task 2: Route and contract documentation

**Files:**
- Modify: `data-service/app/routers/research.py` (add the route after `get_fundamental_analysis`, use `_raise_research_error("financial-history", symbol, exc)`)
- Test: `data-service/tests/test_financial_history_route.py`
- Modify: `docs/spec/current-system/contracts.md` (research route table near line 151: add `GET /api/v1/research/financial-history/{symbol}` | multi-year annual statement history with nulls); `docs/spec/current-system/operations.md` (degradation: EMPTY vs 503)

**Interfaces:**
- Consumes: `FinancialHistoryService.get(symbol)` and `FinancialHistoryResponse` from Task 1.
- Produces: `GET /api/v1/research/financial-history/{symbol}` → 200 `FinancialHistoryResponse`; 503 when `DependencyUnavailableError`.

- [ ] **Step 1: Write the failing tests** using the same `TestClient` setup as the existing research route tests (grep `tests/` for `research/fundamental` to copy it) and the `FakeTicker` from Task 1 (move it to `conftest.py` only if both files need it):
  - `test_returns_200_with_documented_shape`: keys are exactly `symbol, status, currency, period_type, fiscal_year_ends, series, retrieved_at`; `series` keys equal `SERIES_KEYS` in order.
  - `test_unknown_symbol_returns_200_empty`.
  - `test_all_reads_failing_returns_503`.
  - `test_null_is_serialized_as_json_null`: a missing value appears as `null`, not `0`.
- [ ] **Step 2: Run to verify failure.** `... pytest tests/test_financial_history_route.py -q` → FAIL (404 on the route).
- [ ] **Step 3: Add the route** `@router.get("/financial-history/{symbol}", response_model=FinancialHistoryResponse)` as a sync function delegating to the service, same try/except shape as its neighbours. Update the two docs.
- [ ] **Step 4: Run the new tests, then the whole suite.** `node ../scripts/run-with-timeout.cjs 120000 python -m pytest -q` → PASS (if the full run exceeds the local limit, run `tests/test_financial_history_*.py` plus `tests/test_*research*.py` and note CI is the gate).
- [ ] **Step 5: Commit.** `feat(data-service): expose financial-history research route` and, separately, `docs(spec): document financial-history route`.
