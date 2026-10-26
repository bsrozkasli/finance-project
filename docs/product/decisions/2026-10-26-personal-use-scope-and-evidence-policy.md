# Decision: personal-use scope and evidence policy v1 (approved by the product owner)

**Prepared:** 2026-10-26

**Status: APPROVED by the product owner on 2026-10-26** (see the [Approval record](#approval-record) at the end, with the
approver's words). It was first prepared as a proposal; sections 1 to 3 are unchanged from that proposal. A named human approver is required by
the PRD for every closure artifact (PRD section 7.4). The implementing agent drafted this; it does not approve its own draft,
and it did not take the legal, data-rights or finance-risk judgements that are the owner's.

**Inputs:** the owner's statement on 2026-10-26 that the product is for **personal use** ("kişisel kullanım"); the PRD, which
already describes the initial release as a single-user product (sections 1 and 4); the evidence fields the system produces
today (listed in section 2); the decision engine already built and tested in EPIC-001 (`EvidenceStrengthService`, which
applies the PRD-FR-008 thresholds exactly and takes the policy as data).

## 1. Scope decision (approve or amend)

**Proposed:** the product is a personal, single-user research and decision-support tool for its owner. It is not offered to
anyone else, shown to anyone else, or charged for.

What this changes (nothing here lowers a safety rule; it only decides which gates apply now):

| Open question | Effect of personal use | Trigger that reopens it |
|---|---|---|
| OQ-1 jurisdiction and product classification | Not needed for the owner's own decisions. Deferred. | Before any other person uses the product, or any output is shared with a third party. |
| OQ-2 licensed data rights | The system already treats provider observations as research-only and never as a point-in-time classification (decision of 2026-10-23). External display stays blocked. The terms of each free provider (Yahoo via `yfinance`, Finnhub, Tiingo) remain the owner's own responsibility; this is not legal advice. | Before any external display, sharing, or a second user. |
| OQ-6 economics, OQ-7 measurement | No cohort and no paid release, so neither is a gate. Deferred. | Before any cohort expansion or paid release. |
| OQ-8 cohort gates | Cohort and rollback thresholds are not needed. The owner is the incident owner. The logical backup and restore proof already built stays as the recovery evidence, with its stated limits. | Before an invite-only cohort. |
| OQ-3 evidence policy | **Still needed**: Evidence Strength is computed for the owner's own decisions. Proposed in section 2. | n/a |
| OQ-4 financial and risk policy | **Still needed** before PEG, Portfolio Fit or action labels. Not proposed here; it follows after OQ-3. | n/a |
| OQ-5 legacy contract migration | Delegated to the implementing agent on 2026-10-22; unchanged. | n/a |

Cost if wrong: if the product is later shared, the deferred gates apply at that moment and the work they gate (legal
classification, data rights) has to be done then.

## 2. Evidence policy v1 (OQ-3), proposed

The numbers are judgement calls. Each states its reason so it can be amended. The engine applies them exactly:
`High` needs every mandatory field current with no unresolved conflict and at least 90% weighted optional coverage;
`Medium` the same gates and at least 75%; `Low` otherwise; a missing, stale, conflicted, undated or future-dated mandatory
field, or an unresolved instrument type, is `Insufficient`.

### 2.1 Stock policy `stock-v1`

**Mandatory** (all must be present, current and unconflicted):

| Field | Freshness window | Reason |
|---|---|---|
| `price.close` | 5 days | covers a weekend plus one market holiday |
| `fundamentals.revenue` | 400 days | an annual report is at most about 13 months old |
| `fundamentals.netIncome` | 400 days | same |
| `fundamentals.operatingCashFlow` | 400 days | cash generation, not only accounting profit |
| `fundamentals.debtToEquity` | 400 days | leverage; a long-horizon holder needs it |
| `valuation.pe` | 5 days | derived from the price, so it must be as fresh as the price |

**Optional, weighted** (weights sum to 100; each field is covered only when present, current and unconflicted):

| Group | Field (weight) | Window |
|---|---|---|
| Profitability and quality (38) | `roe` 10, `roic` 10, `grossMargin` 6, `operatingMargin` 6, `netMargin` 6 | 400 days |
| Balance sheet (10) | `currentRatio` 6, `quickRatio` 4 | 400 days |
| Valuation (35) | `forwardPe` 8, `evEbitda` 8, `fcfYield` 7, `pb` 5, `ps` 4, `dividendYield` 3 | 5 days |
| Quality scores (17) | `piotroskiFScore` 7, `altmanZScore` 5, `beneishMScore` 5 | 400 days |

Deliberately left out: the provider's trailing `peg` (the PRD forbids it substituting for Target-Horizon PEG), technical
indicators and news sentiment (derived or interpretive signals, not evidence fields; they keep their own section statuses),
and the composite score (it is an output).

**Conflict priority:** two sources disagreeing on a mandatory field is a critical conflict (`Insufficient`); on an optional
field it leaves that field uncovered. Today there is one source, so a conflict is rare.

### 2.2 ETF policy `etf-v1`: a decision you must make

The system produces **no ETF-specific evidence today** (no expense ratio, NAV or premium, assets, or holdings). Adding
a source for them is separate work. The PRD requires "transparent holdings and daily NAV" for an eligible ETF. Two options:

- **Option A (recommended): fail-closed with honest coverage.** Mandatory: `price.close` (5 days). Optional, weighted:
  `expenseRatio` 25, `holdings` 20, `assets` 15, `navPremium` 15, `volume` 15, `dividendYield` 10 (all but `volume` and
  `dividendYield` unavailable now). Result today: an ETF can reach at most `Low` (about 25% coverage), and the report says
  which fund fields are missing. It improves automatically when a fund data source is added, with no policy change.
- **Option B: ETFs are `Insufficient` until fund data exists.** Mandatory: `price.close`, `expenseRatio`, `holdings`. Cleaner
  signal, but every ETF reads `Insufficient` until a source exists, which hides the price evidence that is available.

### 2.3 Independent boundary cases (to become test fixtures)

Expected values are computed by hand from the weights above, not by the engine. All mandatory fields current unless stated.

| Case (stock-v1) | Missing optional weight | Coverage | Expected |
|---|---|---|---|
| All optional present | 0 | 100 | High |
| Missing `roe` | 10 | 90 | High (boundary) |
| Missing `roe` and `dividendYield` | 13 | 87 | Medium |
| Missing `forwardPe`, `fcfYield`, `roe` | 25 | 75 | Medium (boundary) |
| Missing `roe`, `roic`, `grossMargin` | 26 | 74 | Low |
| Missing the whole Valuation group | 35 | 65 | Low |
| Missing the Quality scores group | 17 | 83 | Medium |
| `price.close` 5 days old (exactly) | n/a | n/a | current |
| `price.close` 5 days and 1 second old | n/a | n/a | Insufficient |
| Missing `fundamentals.netIncome` | n/a | n/a | Insufficient (mandatory) |
| `fundamentals.revenue` 401 days old | n/a | n/a | Insufficient (stale mandatory) |
| Two sources disagree on `price.close` | n/a | n/a | Insufficient (critical conflict) |
| Unresolved instrument type | n/a | n/a | Insufficient |

### 2.4 What approval enables, and what it does not

Approval lets the existing engine run with these policies (policies become data; no engine change is needed) and lets
EPIC-001 Task 3 move toward acceptance. It does **not** approve any investment label, weight cap, PEG, Portfolio Fit or
directional decision (OQ-4), and it does not approve external use.

## 3. Rulings already taken on the owner's behalf, for review

Delegated on 2026-10-22 and 2026-10-25. The full records (reason, cost if wrong, how to reverse) are in
`docs/product/decisions/`. The ones that change what you see or what the API returns:

| Ruling | Record |
|---|---|
| An agent verdict that cannot be parsed returns no decision and no confidence (`null`), never a placeholder HOLD/50 | `2026-10-26-agent-analysis-decision-status.md` |
| Deleting a ledger transaction voids it (the row is kept); deleting a buy that a later sell depends on is refused with 409 | `2026-10-25-epic-002-ledger-state-and-csv.md` (D-1, R-17) |
| Portfolio State exposures are computed only from stored prices with matching currencies; otherwise weights are withheld | same record (D-2) |
| CSV import: strict schema v1, staged before acceptance, accepted rows are idempotent, ledger additions are serialized per portfolio | same record (D-4, R-13) |
| Failed provider calls read `FAILED`, not `EMPTY`; empty results are no longer cached for 12 hours; only provider-side failures open the breaker | `2026-10-26-provider-failure-status.md` |
| A price that could not be confirmed current reads `STALE` (watchlist, journal) and makes the watchlist overall `STALE` | `2026-10-26-price-section-status.md`, `2026-10-26-price-staleness.md` |
| Smart report shows which score components are missing; the fallback score is never `OK` | `2026-10-26-section-status-smart-report.md` |

## Approval record

**Approved 2026-10-26.** Approver: the product owner (repository owner). Exact words: **"kararlarını onaylıyorum"**
("I approve your decisions"), given in reply to this document after it was presented in full in the conversation.

How the agent read the approval (stated so it can be corrected): the owner approved the whole package as presented, which
is the agent's recommendation on every point: the personal-use scope (section 1), `stock-v1` (section 2.1), and for ETFs
**Option A** of section 2.2 (the owner did not choose Option B), and the rulings in section 3 as reviewed. If the owner
meant otherwise on any point, this record is amended first and the code that follows is changed to match.

What follows from the approval: the policies `stock-v1` and `etf-v1` (Option A) become versioned data in the domain, with
the section 2.3 cases as independent tests. This closes the policy part of OQ-3 for the personal-use scope. It does not
approve OQ-4, any investment label, weight cap, PEG, Portfolio Fit or directional decision, or any external use. The
deferred gates of section 1 reopen at their stated triggers.
