# Investment Platform Product Foundation Design

**Status:** Approved

**Artifact type:** Product-foundation design

**Canonical role:** Approved input to the target product spec, capability gap
map, epics, and stories

**Not:** The implemented-system `SPEC.md`, the target product spec, an epic, a
story, or a README

**Date:** 2026-09-29

**Discussion language:** Turkish

**Artifact language:** English

## 1. Purpose

This foundation design records the approved product decisions and defines the
documentation program for an evidence-driven investment decision workspace. It
is an input to the canonical artifacts listed in Section 14; it is not itself
the implemented-system contract, target product spec, epic backlog, or
documentation index. It does not claim that the current implementation already
provides every capability described here.

The work will establish an evidence-backed current-state baseline, define the
approved target product, identify capability gaps, and convert those gaps into
traceable epics and testable user stories.

The product will help advanced self-directed investors discover, research,
evaluate, and monitor U.S.-listed stocks and ETFs. It will support investment
decisions without executing trades. This design does not assume that a
personalized action label or suggested weight falls outside regulated investment
advice; Section 4 defines the release gate for that determination.

## 2. Product Positioning

### 2.1 Target user

The primary user is an advanced self-directed retail investor who wants
professional research and portfolio-analysis tools without institutional
workflow complexity.

The initial product will run as a personal, single-user deployment. Evaluation
cohorts MAY use separate isolated deployments, but shared accounts, shared
personalization, subscriptions, and multi-tenant operations remain deferred.

### 2.2 Product promise

The product SHALL enable one connected workflow:

```text
Discover -> Research -> Analyze -> Evaluate Portfolio Fit -> Decide -> Monitor
```

The workflow SHALL connect company and ETF evidence, charts, news, macroeconomic
context, portfolio exposure, and AI-supported explanation without allowing AI
to replace authoritative financial calculations.

### 2.3 Investment universe and horizons

- The initial investment universe SHALL be limited to U.S.-listed stocks and
  ETFs.
- The MVP stock universe SHALL contain NYSE- or Nasdaq-listed U.S. common
  equities. OTC securities, preferred shares, warrants, closed-end funds, and
  foreign depositary receipts SHALL be excluded.
- The MVP ETF universe SHALL contain non-leveraged, non-inverse U.S.-listed
  equity ETFs with transparent holdings and daily NAV data. ETNs, commodity
  pools, crypto-linked products, leveraged or inverse funds, and opaque-holdings
  products SHALL be excluded.
- A licensed or terms-compatible security master SHALL provide point-in-time
  listing, delisting, exchange, and instrument-type records. The screener SHALL
  remain disabled until those usage and redistribution rights are documented.
- Tactical context SHALL cover `0-<3 months` and SHALL inform timing and risk
  context only.
- The medium-term outlook SHALL cover `3-<18 months`.
- The long-term outlook SHALL cover `18-32 months`.
- Medium- and long-term outlooks SHALL be evaluated separately.

## 3. Value MVP

The Value MVP SHALL provide the following end-to-end journey:

1. The user creates a portfolio through manual transaction entry or CSV import.
2. The user discovers candidates through a limited, explainable quantitative
   screener.
3. Each screening result explains why the asset matched.
4. The user moves selected candidates to a shortlist.
5. Cost-intensive AI research runs only for user-selected candidates.
6. Research and charts expose their sources, observation times, and freshness.
7. The system evaluates standalone investment quality.
8. The system separately evaluates marginal portfolio fit.
9. The system produces an auditable Investment Decision Card.
10. The user receives daily summaries and high-priority material-event alerts.

The MVP decision vocabulary SHALL be:

- `Add`
- `Hold`
- `Reduce`
- `Avoid`
- `Watch`

The MVP SHALL use `Evidence Strength`, not predictive confidence. This design
prohibits percentage confidence and `Buy/Hold/Sell`. Enabling either is new
scope and SHALL require a separately approved specification that pre-registers
outcome labels, sample sufficiency, calibration metrics and thresholds,
benchmark policy, market-regime coverage, and independent review before any
implementation story is accepted.

## 4. Explicitly Deferred Scope

The following capabilities are outside the Value MVP:

- Trade-order creation or execution
- Read-only broker synchronization
- Full multi-user SaaS operations, tenant administration, and subscriptions
- Real-time tick infrastructure
- Continuous trading signals
- Daily multi-agent analysis of the full U.S. investment universe
- User-specific LLM fine-tuning
- Psychological personality inference
- Predictive confidence percentages
- `Buy/Hold/Sell` labels

Broker synchronization and SaaS readiness remain target capabilities after MVP
value and unit economics are validated.

### 4.1 Regulatory and data-rights release gate

The target product includes personalized suitability signals, action labels,
and maximum suggested weights. Before any external or commercial release of
those personalized outputs, qualified counsel SHALL document the applicable
jurisdiction, regulatory classification, required disclosures, record-retention
rules, and operating controls. Until that approval exists, external builds SHALL
show objective research and `Policy Fit` only; personalized action labels and
suggested weights SHALL remain feature-flagged off.

Every external data source SHALL have documented rights for the intended
deployment, caching, derived analytics, display, and evaluation use. A provider
without compatible rights SHALL block the affected external release rather than
silently narrow or substitute its data.

## 5. Architecture Boundaries

The target design uses bounded responsibilities within the existing three
runtimes. It does not require new deployable microservices.

Runtime ownership SHALL be explicit:

- The Spring backend SHALL own orchestration, asset identity, snapshot assembly
  and persistence, the transaction ledger, portfolio state, explicit user
  policy, portfolio-fit policy, deterministic decision policy, personal-event
  persistence, and the authoritative API contract.
- The FastAPI data-service SHALL own provider-specific normalization, pure
  asset-specific analytics, deterministic stock and ETF evaluation functions,
  stateless personal-model training and inference operations, and optional LLM
  synthesis. It SHALL return versioned inputs and results to the backend and
  SHALL NOT own user portfolio or model-artifact persistence.
- The Spring backend SHALL validate and persist every versioned personal-model
  artifact through an outbound persistence port. The data-service MAY produce
  or score an artifact, but every replayable artifact ID SHALL resolve through
  backend-owned, user-scoped storage.
- The React frontend SHALL render backend contracts and collect user intent. It
  SHALL NOT calculate authoritative financial metrics, portfolio fit, Evidence
  Strength, or decision labels.
- The backend SHALL enforce hard evidence and risk gates even when a
  data-service result or personal-model score is present.

### 5.1 Asset and Market Data

This boundary SHALL own instrument identity, symbol and provider mappings,
asset classification, raw provider access, normalization, and freshness
metadata.

### 5.2 Research Evidence

This boundary SHALL assemble immutable, versioned evidence snapshots from
price, fundamental, valuation, technical, risk, news, macroeconomic, and
company-event data.

### 5.3 Investment Evaluation

This boundary SHALL calculate asset-specific investment quality independently
from any user portfolio.

### 5.4 Portfolio Accounting

This boundary SHALL own the immutable transaction ledger, derived holdings,
cost basis, realized activity, exposure, and portfolio state.

### 5.5 Portfolio Fit

This boundary SHALL calculate the marginal effect of adding, holding, reducing,
or avoiding an instrument in the user's portfolio.

### 5.6 Personal Investment Policy

This boundary SHALL own explicit risk rules and the validated personal
preference model. It SHALL NOT alter objective market evidence or standalone
investment-quality calculations.

### 5.7 Decision Support

This boundary SHALL combine investment quality, portfolio fit, explicit user
policy, validated personal preferences, and Evidence Strength into the approved
decision vocabulary.

### 5.8 Discovery and Monitoring

Discovery and monitoring SHALL consume the same evaluation contracts as direct
research. They SHALL NOT introduce separate financial scoring logic.

## 6. Target Data Flow

```text
Provider data
  -> identity and asset-type validation
  -> normalization
  -> versioned Research Evidence Snapshot
  -> stock- or ETF-specific evaluation
  -> Investment Quality Result
  -> ledger-derived Portfolio State
  -> Portfolio Fit Result
  -> explicit User Policy
  -> validated Personal Preference Model
  -> Investment Decision Card
  -> optional AI explanation
  -> charts, evidence drill-down, and alerts
```

The technical delivery SHALL first validate the single-ticker research and
portfolio-fit flow. The limited screener SHALL then invoke that same evaluation
core in batches. This sequence preserves the discovery promise without hiding
core evaluation errors behind a broad screening system.

## 7. Research Evidence Snapshot

Every evaluation SHALL reference an immutable `ResearchEvidenceSnapshot` that
contains:

- Snapshot and schema versions
- Instrument identity and asset type
- Observation and retrieval timestamps
- Field-level source and provenance
- Currency and reporting period
- Normalization metadata
- Freshness, availability, and quality status
- Missing or conflicting evidence
- Evidence-schema and normalization-policy versions

A snapshot SHALL NOT contain fabricated values. A revision SHALL create a new
snapshot rather than overwrite historical evidence.

A structured decision replay key SHALL contain:

- `evidenceSnapshotId`
- `portfolioStateId`
- `explicitPolicyVersion`
- `analyticsModelVersion`
- `portfolioFitModelVersion`
- `decisionPolicyVersion`
- `personalModelArtifactId`, or an explicit `none`

Replaying the complete key SHALL reproduce the same structured result.
Evaluation, portfolio-fit, and decision-policy versions belong to their result
records rather than to the evidence snapshot.

### 7.1 Deterministic Evidence Strength

Each versioned stock or ETF evaluation policy SHALL declare its mandatory
evidence fields, field weights, and freshness windows. Evidence Strength SHALL
then be calculated as follows:

- `High`: every mandatory field is current, weighted optional coverage is at
  least 90%, and no critical source conflict remains unresolved.
- `Medium`: every mandatory field is current, weighted optional coverage is at
  least 75% but below 90%, and no critical conflict remains unresolved.
- `Low`: every mandatory field is current, optional coverage is below 75%, or a
  permitted non-critical field is stale or conflicted.
- `Insufficient`: any mandatory field is unavailable or stale, instrument type
  is unresolved, or a critical source conflict remains unresolved.

Coverage SHALL use only fields applicable to the asset type and evaluation
model. Evidence Strength SHALL remain a data-quality classification and SHALL
NOT be described as a probability of investment success.

## 8. Deterministic Analytics and AI Responsibilities

Financial metrics, technical indicators, risk measures, quality scores,
portfolio effects, and decision-policy rules SHALL be deterministic and
independently testable.

The LLM MAY:

- Explain calculated results
- Summarize evidence
- Compare approved scenarios
- Produce a counter-thesis
- Explain catalysts, risks, and invalidation conditions

The LLM SHALL NOT:

- Fetch authoritative market data
- Calculate authoritative financial metrics
- Alter deterministic scores
- Override user or system risk constraints
- Fill missing evidence with estimates that are not present in the snapshot

An LLM timeout, invalid response, or outage SHALL remove only the narrative
layer. Structured research and the Investment Decision Card SHALL remain
available.

The backend contract SHALL separate:

- `DecisionResult`: deterministic outlooks, evidence classification, valuation
  zone, portfolio-fit findings, hard-limit violations, action state, supported
  weight limit, quantitative risk flags, sources, and replay key.
- `NarrativeAttachment`: optional AI summary, qualitative counter-thesis,
  narrative catalysts and risks, and explanation text with its model and prompt
  versions.

The UI MAY compose both records into one visual card, but absence or invalidity
of `NarrativeAttachment` SHALL NOT change `DecisionResult`.

## 9. Asset-Specific Investment Evaluation

Stocks and ETFs MAY share the evidence envelope, but SHALL use separate
validation, metric, and evaluation models.

### 9.1 Stock evaluation

Stock evaluation SHALL consider:

- Revenue, EPS, and free-cash-flow growth
- Estimate revisions and estimate dispersion
- Profitability and margin durability
- Cash conversion and earnings quality
- ROIC and capital allocation
- Balance-sheet resilience and leverage
- Valuation
- Share dilution
- Momentum
- Volatility and drawdown
- Relative performance against market and sector benchmarks

### 9.2 ETF evaluation

ETF evaluation SHALL consider:

- Expense ratio
- Liquidity and spread
- Tracking difference and tracking error
- Holdings concentration
- Benchmark methodology
- Sector and factor exposure
- Premium and discount behavior
- Category-appropriate risk and performance benchmarks

An ETF SHALL NOT be evaluated with company-specific operating metrics.

### 9.3 Benchmark policy

The benchmark mapping SHALL be selected by a versioned rule at decision time
and stored in the evidence snapshot. It SHALL NOT be changed after an outcome is
known.

- A U.S. common stock SHALL use the S&P 500 total-return index as its primary
  market benchmark and its mapped GICS sector total-return benchmark as a
  secondary benchmark.
- An ETF SHALL use its declared tracked index as the primary benchmark. When
  that index is unavailable under compatible data rights, a predeclared
  category benchmark MAY be used and the substitution SHALL reduce Evidence
  Strength.
- An unresolved stock sector or ETF category mapping SHALL block
  benchmark-relative calibration for that asset.
- Benchmark identifier, mapping-policy version, observation times, and any
  substitution SHALL be retained with the decision and outcome record.

## 10. PEG Policy

PEG SHALL be the primary metric in the `Growth-Adjusted Valuation` section for
eligible stocks. It SHALL NOT be the sole determinant of overall investment
quality or of an `Add` decision.

The PEG implementation SHALL meet these requirements:

- The authoritative metric SHALL be labeled `Target-Horizon PEG` to distinguish
  it from an unqualified provider PEG.
- The target date SHALL be the fiscal period end closest to 24 months from the
  snapshot, provided that it falls within `18-32 months`.
- `Target-Horizon PEG` SHALL equal `(Price / Consensus EPS at target date) /
  EPS CAGR in percentage points`.
- EPS CAGR SHALL be calculated from positive normalized current EPS to positive
  consensus target-date EPS over the exact fractional number of years.
- Growth SHALL be expressed in percentage points in the denominator: 20% growth
  is `20`, not `0.20`.
- Price, EPS inputs, target date, analyst count, estimate dispersion, formula
  version, and calculation units SHALL be stored with the result.
- At least three analyst estimates SHALL cover target-date EPS. Fewer estimates
  SHALL make the metric `Not Meaningful`.
- EPS CAGR at or below 2%, negative EPS, or negative growth SHALL make the
  metric `Not Meaningful`.
- EPS CAGR above 50% or estimate dispersion above 50% of the absolute consensus
  mean SHALL mark PEG `High Uncertainty` and exclude it from scored valuation;
  the raw inputs MAY remain visible.
- Trailing PEG SHALL be labeled separately and SHALL NOT be mixed with forward
  PEG.
- PEG SHALL be `Not Meaningful` for negative or near-zero EPS, negative or
  near-zero growth, unreliable estimate coverage, and unsupported company
  profiles.
- PEG SHALL NOT be applied to ETFs.
- PEG SHALL be compared within an appropriate sector, business model, and
  company-life-cycle peer group.
- A scored peer percentile SHALL require at least ten eligible peers from the
  same versioned universe snapshot; otherwise PEG SHALL remain informational.
- A universal rule such as `PEG < 1 means cheap` SHALL NOT be used.
- Estimate revisions, estimate dispersion, and data freshness SHALL accompany
  the PEG interpretation.
- ROIC, free-cash-flow growth and conversion, margin durability, leverage,
  dilution, and earnings quality SHALL act as quality gates.
- AI MAY explain whether a low PEG represents opportunity or elevated risk, but
  SHALL NOT invent missing growth estimates.

Initial implementation inspection at evidence level E2 indicates a raw provider
PEG, fixed universal thresholds, and equal ratio weight. The baseline audit
SHALL verify this observation and SHALL treat confirmed findings as a
current-state gap rather than a validated target model.

## 11. Investment Quality, Portfolio Fit, and Decision Card

The system SHALL answer two independent questions:

1. Is the asset attractive on a standalone, risk-aware basis?
2. Is the asset appropriate for this user's current portfolio and policy?

A high-quality asset SHALL NOT automatically receive `Add` when it creates an
unacceptable concentration, correlation, factor exposure, or drawdown risk.

The deterministic `DecisionResult` SHALL include:

- Snapshot time and version
- Evidence Strength
- `3-<18 month` outlook
- `18-32 month` outlook
- Benchmark identifiers selected by the versioned policy in Section 9.3
- Valuation zone
- Standalone investment-quality result
- Portfolio-fit result and limit violations
- `Add`, `Hold`, `Reduce`, `Avoid`, or `Watch`
- Deterministically supported maximum suggested weight
- Strongest quantitative supporting evidence
- Quantitative risk flags and deterministic thesis-invalidation thresholds
- Sources and missing evidence
- The complete replay key

When available, `NarrativeAttachment` SHALL add:

- Qualitative supporting explanation
- Strongest counter-thesis
- Narrative catalysts and risks
- Model and prompt versions

Expected-return ranges and suggested maximum weights SHALL appear only when
supported by deterministic calculations. The card SHALL NOT represent or
execute a trade order.

### 11.1 Decision-label semantics

- `Add` MAY apply to an unowned or owned asset and means the asset is eligible
  for a new or increased position within the displayed hard weight limit.
- `Hold` SHALL apply only to an owned asset and means no position change is
  supported by the current evidence and policy.
- `Reduce` SHALL apply only to an owned asset and means exposure exceeds the
  evidence-supported or policy-supported level.
- `Avoid` SHALL apply only to an unowned asset and means the deterministic
  evaluation is negative or a hard policy constraint prevents ownership.
- `Watch` MAY apply to an owned or unowned asset and is a non-directional
  monitoring state. It SHALL be used when evidence is insufficient, the thesis
  is neutral, or a declared trigger has not occurred.

`Watch - Insufficient Evidence` SHALL NOT be represented as an investment
opinion. In that state, directional outlooks, expected returns, action-oriented
portfolio fit, and suggested weight SHALL be suppressed. The card SHALL show
only available evidence, missing requirements, current exposure when relevant,
and the conditions required for reevaluation.

### 11.2 Personalization transition guardrails

The deterministic policy SHALL produce a base label before personalization.
The learned model SHALL NOT directly assign a label or weight. It SHALL produce
a versioned `PersonalPolicyAdjustment`; the backend deterministic decision
policy MAY apply only these one-step adjustments when evidence is at least
`Medium` and no hard limit is violated:

- `Add` to `Watch`, or `Watch` to `Add` when the base quality outlook is positive
- `Hold` to `Add` or `Reduce`
- `Reduce` to `Hold`
- `Avoid` to `Watch`

The backend policy SHALL NOT change `Avoid` directly to `Add`, change `Reduce`
directly to `Add`, or alter `Watch - Insufficient Evidence`. A personalized
suggested weight MAY be lowered by the learned adjustment but SHALL NOT exceed
the deterministic and explicit-policy cap. Increasing that cap SHALL require an
explicit user policy change rather than learned behavior.

## 12. Personal Investment Policy Model

The product SHALL begin with an explicit user policy containing:

- Risk tolerance
- Preferred investment horizon
- Maximum position weight
- Sector-concentration limits
- Excluded assets or sectors

With explicit, revocable consent, the system MAY collect append-only decision
events within the user's active retention lifecycle, such as:

- Candidate viewed or skipped
- Shortlist addition or removal
- `Add`, `Hold`, `Reduce`, `Avoid`, or `Watch` selection
- System decision overridden
- Optional decision rationale
- Threshold change
- Later user assessment
- Point-in-time outcome observations at defined horizons

Each decision event SHALL reference the evidence snapshot, portfolio state,
portfolio-fit result, displayed alternatives, and explicit-policy version that
existed at decision time. Later information SHALL NOT be inserted into the
historical decision inputs.

The initial personal model SHALL contain two bounded components:

- A pairwise suitability ranker whose target is the user's explicit preference
  between two or more deterministically eligible candidates under the portfolio
  state and policy that existed at decision time.
- A policy calibrator whose labels are explicit threshold edits, confirmed
  overrides, and confirmed action preferences. It MAY propose bounded changes
  to soft policy thresholds and MAY lower a suggested weight cap. It SHALL NOT
  alter hard limits or increase an explicit weight cap.

Passive views and clicks MAY be used for diagnostics but SHALL NOT be treated
as positive preference labels. Both components SHALL optimize policy-aligned
suitability, not predicted return, engagement, or trading frequency. The backend
deterministic decision policy SHALL convert an approved adjustment into any
user-visible label or weight.

The training set SHALL record every alternative shown, including rejected
alternatives, to reduce selection and feedback-loop bias. Model-generated
rankings SHALL NOT become training labels unless the user explicitly confirms a
preference. Cross-user training and transfer of behavioral features SHALL remain
disabled unless a later approved specification defines consent, isolation,
privacy, and bias controls.

The personal model MAY affect:

- Candidate ranking
- Content and alert priority
- Alert thresholds
- Maximum suggested weight
- The final decision label within hard risk boundaries

The personal model SHALL NOT affect:

- Objective financial evidence
- Standalone investment-quality calculations
- Minimum-evidence rules
- Hard portfolio-risk constraints
- Provider provenance or freshness

Personalization SHALL progress through event instrumentation, offline training,
shadow-mode comparison, limited ranking and threshold activation, and only then
controlled decision influence.

- Ranking personalization SHALL require at least 20 explicit preference or
  override decisions collected over at least eight weeks.
- It SHALL then run in shadow mode for at least four weeks with zero hard-policy
  violations before the user may opt into personalized ranking.
- Decision-label or suggested-weight influence SHALL remain disabled until at
  least 30 decisions have matured through a three-month observation window,
  shadow replay shows zero hard-policy violations, and the user approves the
  side-by-side personalized policy preview.
- Any hard-policy violation, deletion request, consent withdrawal, or detected
  drift SHALL disable learned influence and restore the explicit-policy result.

Investment-outcome claims SHALL wait for the declared investment horizons to
mature; short interaction history MAY inform preference learning but SHALL NOT
be presented as return-prediction evidence.

The user SHALL be able to inspect, correct, export, reset, and delete personal
policy data and learned model state. Revoking consent SHALL stop future learning
without disabling core portfolio functionality.

A deletion SHALL remove active decision events, derived features, personal
portfolio snapshots, personal-model artifacts, personalized narratives, exports,
caches, retained personal `DecisionResult` records, and their replay keys.
Shared market evidence MAY remain only after personal references are removed.
Deleted personal results SHALL be replaced only by a non-identifying deletion
receipt; the replay guarantee SHALL end for those deleted results and SHALL
continue to apply to every retained result.

Backup copies SHALL be cryptographically erased or expire within 30 days unless
a documented legal-retention duty applies. Legally retained records SHALL be
minimized, access-restricted, excluded from serving and model training, disclosed
to the user, and deleted when the approved retention period expires. Deletion
completion SHALL be auditable without retaining deleted behavioral content.

## 13. Graceful Degradation

Every provider-backed section SHALL expose one of:

```text
OK | STALE | EMPTY | FAILED | RATE_LIMITED | INSUFFICIENT_DATA | PENDING_REFRESH
```

Partial provider failure SHALL preserve valid sections. The system SHALL NOT
fabricate values, zero-fill unavailable data, or silently represent stale data
as current.

When minimum evidence requirements are not met, the system SHALL return
`Watch - Insufficient Evidence`, identify the blocking evidence gaps, and reduce
Evidence Strength.

A personal-model timeout, deletion, drift event, or insufficient history SHALL
fall back to the explicit user policy and a conservative deterministic default.

CSV imports SHALL pass through staging, validation, deduplication, and
reconciliation. Re-importing the same file SHALL NOT duplicate ledger entries.

## 14. Documentation and Traceability Model

Existing documents SHALL be treated as claims until validated against stronger
evidence. Every current-state capability SHALL receive one evidence level:

Artifact names SHALL communicate their role:

| Artifact | Meaning |
| --- | --- |
| `SPEC.md` | Canonical contract for behavior that is implemented and verified |
| `docs/superpowers/specs/YYYY-MM-DD-*-design.md` | Reviewed foundation or feature-design record that precedes canonical delivery artifacts |
| `docs/product/CURRENT_STATE_BASELINE.md` | Evidence-backed inventory of what exists now |
| `docs/product/TARGET_PRODUCT_SPEC.md` | Canonical target product requirements; it SHALL NOT claim implementation |
| `docs/product/CAPABILITY_GAP_MAP.md` | Traceability from current evidence to target gaps and delivery ownership |
| `docs/product/epics/EPIC-NNN-*.md` | One user-outcome epic |
| `docs/product/stories/EPIC-NNN/STORY-NNN-NN-*.md` | One testable user story owned by an epic |
| `docs/README.md` | Documentation index only; it SHALL NOT define product behavior |

The word `spec` SHALL be reserved for a normative contract or requirement set.
The word `design` SHALL identify a reviewed solution or foundation decision.
`Epic` and `story` SHALL appear only in delivery artifacts with their IDs.

- `E3 - Runtime Verified`: observed through a passing test or executed scenario
- `E2 - Implementation Verified`: code and contract inspected but not executed
- `E1 - Documented Claim`: supported only by existing documentation
- `E0 - Missing or Contradicted`: absent, incomplete, or inconsistent with
  stronger evidence

Every baseline record SHALL include capability ID, evidence level, repository
commit, file path and symbol or endpoint, reviewer, review date, environment,
known limitations, and an evidence locator. An E3 locator SHALL additionally
include the exact test or scenario command, relevant result, execution date,
and environment. An E2 record without a code locator SHALL be downgraded to E1.

The documentation chain SHALL be:

```text
Current-State Baseline
  -> Target Product Specification
  -> Capability Gap Map
  -> Epics
  -> User Stories
  -> Acceptance and Verification Evidence
```

The planned artifact structure is:

```text
docs/product/
|-- CURRENT_STATE_BASELINE.md
|-- TARGET_PRODUCT_SPEC.md
|-- CAPABILITY_GAP_MAP.md
|-- epics/
|   |-- EPIC-000-current-state-verification.md
|   `-- EPIC-001-trusted-market-evidence.md
`-- stories/
    `-- EPIC-001/
        `-- STORY-001-01-establish-evidence-snapshot.md
```

The root `SPEC.md` SHALL remain the implemented system contract. Target
capabilities SHALL NOT be added to it as if they were implemented. A target
capability MAY be promoted into `SPEC.md` only after implementation and
verification.

Identifiers SHALL use:

- `PRD-FR-*` for functional requirements
- `PRD-NFR-*` for quality requirements
- `CAP-*` for capabilities
- `EPIC-*` for user-outcome epics
- `STORY-*` for testable stories

Each gap-map entry SHALL connect capability, current evidence, target
requirement, identified gap, owning epic, implementing stories, and acceptance
evidence.

Each user story SHALL include business value, scope, exclusions, preconditions,
acceptance criteria, provenance requirements, degradation behavior, testing
expectations, dependencies, traceability, and definition of done.

Existing documents SHALL NOT be deleted during the baseline audit. Conflicts
SHALL be recorded, not silently resolved. Architecture decisions SHALL continue
to use `docs/adr/`.

## 15. Epic Structure and Delivery Phases

Epics SHALL represent user outcomes rather than internal technical layers.

| Epic | User outcome |
| --- | --- |
| `EPIC-000` | View a verified baseline of current capabilities and gaps |
| `EPIC-001` | Trust source-, time-, and quality-traceable market evidence |
| `EPIC-002` | Build a consistent portfolio and cost basis from manual or CSV transactions |
| `EPIC-003` | Research one stock or ETF end to end with evidence and charts |
| `EPIC-004` | Separate investment quality from portfolio fit and receive a Decision Card |
| `EPIC-005` | Discover candidates through an explainable quantitative screen |
| `EPIC-006` | Understand decisions through sourced AI narrative, counter-thesis, and scenarios |
| `EPIC-007` | Monitor material portfolio and candidate changes through summaries and alerts |
| `EPIC-008` | Adapt results through a consented, validated personal investment policy model |
| `EPIC-009` | Reconcile a portfolio through read-only broker synchronization |
| `EPIC-010` | Support account ownership, isolation, and SaaS operations |

Delivery SHALL follow:

```text
Phase 0 - Establish the Truth
EPIC-000

Phase 1 - Build the Trusted Core
EPIC-001 -> EPIC-002 -> EPIC-003 -> EPIC-004

Phase 2 - Complete the Value MVP
EPIC-005 -> EPIC-006 -> EPIC-007

Phase 3 - Learn and Personalize
EPIC-008

Phase 4 - Connect and Scale
EPIC-009 -> EPIC-010
```

`EPIC-009` and `EPIC-010` SHALL remain outside the MVP story backlog.

## 16. Success Measures

Measurement terms SHALL mean:

- `Activated user`: a user who has created or imported a portfolio and completed
  one research and portfolio-fit review.
- `Meaningful research result`: a `DecisionResult` with at least `Medium`
  Evidence Strength, or a fully explained `Watch - Insufficient Evidence` result
  that identifies its blocking gaps.
- `Activated Discovery`: completion of screener, shortlist, research, and
  portfolio-fit review for at least one candidate within seven days.
- `Weekly activated-user retention`: an activated user completing research,
  portfolio review, or alert review in the next seven-day window.
- `Source and freshness coverage`: the share of displayed decision fields with
  a source, observation time, and status inside the applicable versioned
  freshness window.

The evaluation cohort SHALL target:

- First meaningful research result in under 10 minutes
- At least 40% of activated users completing screener, shortlist, research, and
  portfolio-fit review within seven days
- At least 50% of activated users saving one candidate in the first session
- At least 35% weekly activated-user retention
- At least 95% source and freshness coverage
- At least 70% of pilot users rating the rationale as understandable and
  decision-relevant
- At least 20% relative improvement, compared with a control group, in the share
  of shortlisted candidates that reach a completed research and portfolio-fit
  decision after validated personalization is enabled
- At least 80% of personalization users rating the personalized policy result
  as aligned with their stated constraints
- Zero personalization-driven hard-policy violations

Every Decision Card SHALL reference its snapshot and model versions. Fabricated
financial data tolerance SHALL be zero. The same complete replay key defined in
Section 7 SHALL produce the same structured result.

AI and licensed-data cost per activated and retained user SHALL be measured
separately. Each evaluation stage SHALL enforce an approved monthly
variable-cost budget before its cohort expands. Pricing, payment, and a numeric
gross-margin floor belong to `EPIC-010`; this design does not authorize a paid
release.

Alert evaluation SHALL use these initial gates:

- High-priority alerts SHALL be limited to earnings or regulatory filings,
  deterministic portfolio-limit breaches, provider-confirmed corporate events,
  and critical evidence-staleness events.
- Daily-summary alerts SHALL be delivered within 24 hours of successful event
  ingestion.
- Unsupported high-severity alerts SHALL be zero.
- Duplicate alerts for the same asset, event, and evidence version SHALL remain
  below 2%.
- At least 70% of rated alerts SHALL be marked useful during the evaluation
  cohort.
- Failure of any gate SHALL disable high-priority alerting while preserving the
  underlying event history.

## 17. Testing and Financial Validation

All financial metrics SHALL be validated against independently calculated,
versioned fixtures with documented formulas, units, periods, and rounding
rules.

PEG tests SHALL cover forward and trailing definitions, period alignment,
negative and near-zero EPS or growth, extreme growth, estimate revisions,
missing data, and `Not Meaningful` outcomes.

Validation fixtures SHALL be point-in-time, provider-independent, and usable
without live market APIs. They SHALL include missing fields, stale observations,
conflicting providers, restatements, and corporate actions.

Financial outcome validation SHALL control for:

- Look-ahead bias
- Survivorship bias
- Delistings
- Corporate actions and distributions
- Transaction costs and slippage
- Asset-appropriate benchmarks
- Declared time horizons
- Market regimes

Validation SHALL use walk-forward and out-of-sample testing. Results SHALL be
reported by asset type, time horizon, and market regime.

Provider tests SHALL use stubs or wire-level mocks. Tests SHALL never call live
external financial APIs.

Runtime expectations SHALL follow repository rules:

- Backend tests cover domain policies, snapshot replay, controller contracts,
  degradation, ledger persistence, and CSV idempotency.
- Data-service tests cover provider normalization, boundary cases, stock/ETF
  separation, and deterministic analytics. DataFrame comparisons use
  `pandas.testing.assert_frame_equal`.
- Frontend tests cover provenance, status rendering, LLM-independent results,
  and personal-model fallback.
- Cross-runtime contract tests verify Spring DTOs, FastAPI schemas, and
  TypeScript types against shared versioned fixtures.
- Privacy tests verify model reset, deletion propagation, cache eviction, and
  separation of personal data from shared evidence.

## 18. Release and Rollback Gates

Release stages SHALL be:

```text
Internal Validation -> Owner Alpha -> Isolated Invite-Only Evaluation -> MVP Release
```

Each stage SHALL define entry, exit, stop, and rollback criteria before cohort
expansion. AI explanation, personalization, alerts, and new providers SHALL be
independently feature-flagged and immediately disableable without corrupting
portfolio or research history.

An external evaluation or MVP release SHALL additionally require documented
data usage rights and the regulatory approval described in Section 4.1. Payment
and shared SaaS operations SHALL remain disabled until `EPIC-010` is approved
and completed.

A release SHALL be blocked by:

- An untraceable decision or evidence field
- Non-deterministic replay of a structured decision
- Fabricated market or financial data
- Contract drift across runtimes
- Duplicate CSV ledger entries
- Provider, LLM, or personal-model failure that stops the deterministic core
- Personalization that violates hard risk limits
- Cross-user data exposure
- Incomplete personal-data or model-state deletion
- Any failing applicable test

Long-horizon investment outcomes SHALL be monitored, but financial return SHALL
not be the sole release gate. Evidence integrity, workflow value, alert quality,
privacy, and variable cost SHALL be evaluated together.

## 19. Design Rationale

The design deliberately separates objective evidence, deterministic financial
analysis, portfolio-specific suitability, learned personal preference, and AI
explanation. This prevents a persuasive narrative or a user's recent behavior
from rewriting financial facts.

The Value MVP combines discovery and portfolio context because either capability in
isolation would under-deliver the product promise. The implementation sequence
still validates the single-asset decision core before introducing batch
screening.

PEG receives a prominent but bounded role because growth-adjusted valuation is
important for eligible growth companies, while a universal PEG threshold would
ignore risk, growth quality, and sector economics.

The documentation program separates current evidence from target intent so that
AI-generated legacy documents cannot silently become requirements.

## 20. Reference

- Aswath Damodaran, *Investment Valuation*, discussion of PEG ratios and their
  risk and growth limitations:
  https://pages.stern.nyu.edu/~adamodar/pdfiles/DSV2/DSV2.pdf
