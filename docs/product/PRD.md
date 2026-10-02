| Workflow metadata | Value |
|---|---|
| **stepsCompleted** | `intake`, `brownfield-assessment`, `source-discovery`, `source-reconciliation`, `research`, `drafting`, `review-reconciliation`, `gap-mapping`, `final-validation` |
| **workflowComplete** | `true` |
| **completedAt** | `2026-10-02` |
| **inputDocuments** | `AGENTS.md`<br>`SPEC.md`<br>`docs/superpowers/specs/2026-09-29-investment-platform-product-foundation-design.md`<br>`docs/superpowers/plans/2026-09-29-product-documentation-reconstruction.md`<br>Six external primary sources listed in References |
| **workflowType** | `create-prd` |
| **briefCount** | `0` |
| **researchCount** | `6` |
| **brainstormingCount** | `1` |
| **projectDocsCount** | `4` |
| **classification** | `Brownfield / Fintech / Investment Decision Support / Web / AI-Assisted / High-Trust / Regulated-Adjacent` |

The count fields include direct source artifacts only. Reconciliation and
review files produced by this workflow are derived artifacts and are not
included in `inputDocuments` or the source counts.
`workflowComplete` records completion of this target-document and gap-mapping
workflow. It does not assert implementation readiness for blocked rows,
qualified-counsel approval, data rights, or release readiness.

# PRD: Evidence-Driven Investment Platform

## 1. Executive Summary

The Evidence-Driven Investment Platform is a personal investment decision
workspace for advanced self-directed investors researching U.S. stocks and
eligible U.S. equity ETFs. It connects discovery, research, deterministic
analytics, portfolio context, decision support, and monitoring in one auditable
workflow:

```text
Discover -> Research -> Analyze -> Portfolio Fit -> Decide -> Monitor
```

The product thesis is that decision quality improves when an investor can see
the evidence, calculation policy, missing data, portfolio consequences, and
counter-thesis behind a conclusion. Deterministic financial analytics remain
authoritative. AI improves comprehension and challenge; it does not invent
evidence, calculate authoritative metrics, or override risk limits.

The initial release is a single-user web product. It supports manual or CSV
portfolio onboarding and does not execute trades. Long Term (`18–32 months`)
and Medium Term (`3–<18 months`) receive separate outlooks. Tactical Context
(`0–<3 months`) is limited to timing and risk.

### 1.1 Brownfield Product Boundary

This PRD defines the target product. It does not claim that its capabilities
are implemented. Root `SPEC.md` and
`docs/product/CURRENT_STATE_BASELINE.md` describe the audited current system.
A PRD requirement may be promoted into `SPEC.md` only after implementation
and E3 runtime verification. The capability gap map is the required handoff
between this target contract and current evidence.

No separate Product Brief is required for this brownfield workflow. The
approved product-foundation design already supplies the problem, user, value
proposition, scope, and product principles that a brief would normally
establish. A future one- or two-page brief may be derived from this PRD for
executive or investor communication, but it will not replace the PRD as the
source of truth.

### 1.2 Product Principles

1. Evidence before narrative.
2. Deterministic analytics before AI explanation.
3. Investment Quality and Portfolio Fit remain separate.
4. Missing evidence reduces or suppresses conclusions; it never becomes a
   neutral or fabricated value.
5. Stock and ETF evaluation models remain distinct.
6. Personalization may refine eligible choices but never rewrite evidence or
   relax a hard limit.
7. Engagement and investment return may be observed but not optimized at the
   expense of trust, suitability, or traceability.

## 2. Success Criteria

### 2.1 Measurement Definitions

- **Activated User:** A user who has created or imported a portfolio and
  completed one research and Portfolio Fit review.
- **Meaningful Research Result:** A Decision Result with at least `Medium`
  Evidence Strength, or a fully explained `Watch - Insufficient Evidence`
  result that identifies its blocking gaps.
- **Activated Discovery:** Completion of screener, shortlist, research, and
  Portfolio Fit review for at least one candidate within seven days.
- **Weekly Activated-User Retention:** An Activated User completing research,
  portfolio review, or alert review in the next seven-day window.
- **Source and Freshness Coverage:** The share of displayed decision fields
  with a source, observation time, and status inside the applicable versioned
  freshness window.

### 2.2 Product Success Metrics

| ID | Metric and target | Validates |
|---|---|---|
| `SM-1` | First Meaningful Research Result in under 10 minutes | `PRD-FR-016`, `PRD-FR-032`–`035`, `PRD-NFR-011` |
| `SM-2` | At least 40% of Activated Users complete Activated Discovery within seven days | `PRD-FR-032`–`035` |
| `SM-3` | At least 50% of Activated Users save one candidate in the first session | `PRD-FR-034` |
| `SM-4` | At least 35% Weekly Activated-User Retention | `PRD-FR-031`, `PRD-FR-040`–`043` |
| `SM-5` | At least 95% Source and Freshness Coverage, with 100% coverage for decision-critical fields | `PRD-FR-006`, `PRD-NFR-001` |
| `SM-6` | At least 70% of pilot users rate the rationale understandable and decision-relevant | `PRD-FR-027`, `PRD-FR-030`, `PRD-FR-037` |
| `SM-7` | Zero unsupported high-severity alerts, fewer than 2% duplicate alerts for the same asset/event/evidence version, and at least 70% of rated alerts marked useful | `PRD-FR-040`–`043` |
| `SM-8` | After validated personalization, at least 20% relative improvement versus a control group in the share of shortlisted candidates reaching a completed research and Portfolio Fit decision | `PRD-FR-044`–`049` |
| `SM-9` | At least 80% of personalization users rate the result aligned with stated constraints, with zero hard-policy violations | `PRD-FR-044`–`049` |

### 2.3 Counter-Metrics and Trust Gates

- **`SM-C1` — No Fabrication:** Zero fabricated market, financial, event, or
  portfolio values.
- **`SM-C2` — No Untraceable Decisions:** Zero retained Decision Results
  without a complete replay key.
- **`SM-C3` — No Policy Harm:** Zero personalization-driven hard-limit
  violations.
- **`SM-C4` — No Alert Inflation:** Alert count and click-through rate are not
  optimization targets.
- **`SM-C5` — Return Is Not the Sole KPI:** Portfolio return is evaluated by
  horizon and benchmark but cannot independently authorize release or model
  expansion.
- **`SM-C6` — Deterministic Availability:** Provider, LLM, or personal-model
  failure cannot disable the deterministic core.

### 2.4 Measurement and Stage-Gate Governance

The targets above are evaluation goals. A versioned measurement specification
SHALL freeze each metric's event definition, cohort, exclusions, calculation,
survey instrument where relevant, and data-quality checks before a cohort is
evaluated. The following floors are proposed planning defaults; `OQ-7` and
`OQ-8` require product-owner approval before they may govern promotion. A
missing or unapproved measurement specification blocks cohort expansion.

| Metric | Population and start event | Window and minimum sample | Calculation owner and release consequence |
|---|---|---|---|
| `SM-1` | New evaluation users; timer starts when a supported instrument is selected or a CSV/manual onboarding flow begins, whichever begins the first research journey. | First session, up to 60 minutes; at least 30 users with complete timing events. | Product Analytics; report median and share under 10 minutes. The under-10-minute target requires an approved percentile gate under `OQ-7`; otherwise it is diagnostic and cannot authorize expansion. |
| `SM-2` | Activated Users; start at activation event. | Seven days; at least 30 activated users with a full observation window. | Product Analytics; fewer than 40% completing screen, shortlist, research, and Portfolio Fit blocks Value-MVP promotion. |
| `SM-3` | Activated Users; start at first session after activation. | That session; at least 30 activated users. | Product Analytics; fewer than 50% saving a candidate blocks Value-MVP promotion. |
| `SM-4` | Activated Users; start at activation and observe the next seven-day window. | Seven days; at least 30 activated users with a full window. | Product Analytics; below 35% qualifying retention blocks Value-MVP promotion. |
| `SM-5` | All displayed evidence fields, separately identifying decision-critical fields; start at first rendered result. | Full evaluated cohort; at least 100 field observations across at least 30 users. | Data Governance; below 95% overall or below 100% critical coverage blocks every external cohort. |
| `SM-6` | Pilot users shown a Decision Card; start after one completed review. | Survey within seven days; at least 20 independent ratings with a declared response rate. | Product Research; below 70% useful/understandable ratings blocks Value-MVP promotion. |
| `SM-7` | All eligible high-priority alerts and rated alerts; start at event ingestion. | At least 30 days and 30 eligible events; usefulness requires at least 20 ratings. | Product Operations; any unsupported high-severity alert or duplicate rate at/above 2% disables high-priority alerting; usefulness below 70% blocks expansion. |
| `SM-8` | Consenting eligible personalization users and a preassigned control cohort; start at the ranking activation event. | At least eight weeks plus the approved observation window; at least 30 eligible users per arm. | Product Analytics; below 20% relative uplift blocks learned ranking expansion and cannot justify label/weight influence. |
| `SM-9` | Personalization users with a displayed policy result; start at first personalized result. | Survey within seven days; at least 20 ratings and all policy-violation events. | Product Research and Risk; below 80% alignment or any hard-policy violation disables learned influence. |

The proposed floors are not statistical power claims. `OQ-7` must approve
sampling, missing-event handling, survey wording, and confidence reporting;
`OQ-8` must approve the final cohort sizes and observation periods. Selection
and outcome records shall be frozen before analysis, and small samples shall
be reported as insufficient rather than promoted as a pass.

## 3. Product Scope

### 3.1 Target User and Jobs To Be Done

The primary user is an advanced self-directed retail investor who researches
individual U.S. equities and equity ETFs, manages a long-horizon portfolio,
accepts responsibility for the final decision, and values reproducibility,
source visibility, and explicit uncertainty.

The user needs to:

- discover securities that fit an explicit thesis and horizon;
- understand why a candidate matched an explainable screen;
- connect company, sector, macro, news, price, risk, and estimate evidence;
- compare growth-adjusted valuation without treating one ratio as a verdict;
- separate asset attractiveness from portfolio suitability;
- record and later replay a point-in-time decision; and
- monitor material thesis changes without noisy trading signals.

### 3.2 Investment Universe and Horizons

The Value MVP supports:

- NYSE- and Nasdaq-listed U.S. common equities; and
- non-leveraged, non-inverse U.S. equity ETFs with transparent holdings and
  daily NAV.

Membership and instrument type must come from a licensed, point-in-time
security master. Unsupported or unresolved instruments fail classification;
they do not silently fall back to `STOCK`.

The decision horizons are:

- **Tactical Context:** `0 to <3 months`; timing and risk only.
- **Medium Term:** `3 to <18 months`; critical supporting horizon.
- **Long Term:** `18 to 32 months`; a separate investment outlook.

### 3.3 Value-MVP In Scope

- Manual transaction entry and staged CSV import.
- One portfolio in the initial single-user Value MVP; multi-portfolio and cash
  accounting semantics require a separately approved scope decision.
- Ledger-derived Portfolio State.
- Explainable deterministic screening and shortlist.
- User-selected stock or ETF research.
- Immutable evidence snapshots with provenance, freshness, and missingness.
- Separate stock and ETF evaluation models.
- Separate Investment Quality and Portfolio Fit.
- Deterministic Decision Result and optional AI Narrative Attachment.
- Decision labels: `Add`, `Hold`, `Reduce`, `Avoid`, and `Watch`.
- Daily summaries and bounded high-priority alerts.
- Graceful provider and LLM degradation.

### 3.4 Explicitly Out of Scope for Value MVP

- Trade creation, routing, execution, or automatic rebalancing.
- Broker synchronization or write-back.
- Shared accounts, subscriptions, and multi-tenant SaaS operation.
- Real-time ticks and continuous trading signals.
- Full-universe daily multi-agent analysis.
- User-specific general-purpose LLM fine-tuning.
- Psychological inference or hidden-risk-tolerance inference.
- Predictive confidence percentages or `Buy/Hold/Sell` in the new Decision
  Result.
- OTC securities, ADRs, preferreds, warrants, closed-end funds, ETNs,
  leveraged/inverse products, commodity products, crypto-linked products, and
  opaque-holdings products.
- Comprehensive financial planning, tax advice, or guaranteed outcomes.

### 3.5 Target Capabilities

| Capability | Target outcome | Delivery stage | Status |
|---|---|---:|---|
| `CAP-TGT-001` | Trusted, source/time/quality-traceable market evidence | V1 Foundation | Approved |
| `CAP-TGT-002` | Ledger-derived portfolio state from manual and CSV transactions | V1 Foundation | Approved |
| `CAP-TGT-003` | End-to-end stock/ETF research with contextual charts | V1 Foundation | Approved |
| `CAP-TGT-004` | Separate Investment Quality and Portfolio Fit with an auditable Decision Result | V1 Foundation | Approved |
| `CAP-TGT-005` | Explainable quantitative discovery and shortlisting | V1 Completion | Approved |
| `CAP-TGT-006` | Optional sourced AI explanation and counter-thesis | V1 Completion | Approved |
| `CAP-TGT-007` | Daily summaries and material-change monitoring | V1 Completion | Approved |
| `CAP-TGT-008` | Consented, bounded personal policy learning | Post-V1 | Approved |
| `CAP-TGT-009` | Read-only broker synchronization and reconciliation | Post-V1 | Deferred |
| `CAP-TGT-010` | Production identity, isolation, subscriptions, and SaaS operations | Post-V1 | Deferred |

### 3.6 Glossary

- **Decision Card:** The user-facing presentation of one Decision Result and,
  when available, its Narrative Attachment.
- **Decision Event:** A consented record of an explicit choice, override,
  threshold edit, or confirmed preference with point-in-time inputs.
- **Decision Result:** The authoritative structured result produced by
  deterministic policy from evidence, analytics, Portfolio Fit, and User
  Policy.
- **Evidence Strength:** A deterministic statement about evidence quality and
  completeness; never a probability of investment success.
- **Investment Quality:** The asset's standalone, portfolio-independent
  evaluation for a stated horizon.
- **Narrative Attachment:** Optional AI explanation linked to, but unable to
  modify, a Decision Result.
- **Portfolio Fit:** The marginal effect of an asset on a specific
  ledger-derived Portfolio State under User Policy.
- **Portfolio State:** Holdings, cost basis, realized activity, and exposures
  derived from an immutable transaction ledger at a point in time.
- **Research Evidence Snapshot:** An immutable, versioned collection of the
  evidence used for an evaluation or decision.
- **Target-Horizon PEG:** Growth-adjusted stock valuation calculated from
  snapshot price, target-period consensus EPS, and exact-period EPS CAGR under
  explicit eligibility gates.
- **User Policy:** Explicit risk tolerance, horizon, position cap, sector
  limits, and exclusions. Learned personalization is subordinate to it.
- **Value MVP:** The smallest release proving the connected research and
  portfolio-decision workflow without broker synchronization or SaaS scale.

## 4. User Journeys

### UJ-1: Deniz establishes a trustworthy Portfolio State

Deniz enters transactions manually or uploads a CSV. The system stages the
import, identifies invalid and duplicate rows, asks Deniz to resolve conflicts,
and builds holdings from accepted ledger events. Each position, cost basis, and
realized event remains traceable to its source transaction.

### UJ-2: Deniz discovers an explainable candidate

Deniz selects a horizon and runs a deterministic screen. Returned candidates
explain why they matched and show evidence freshness. Deniz saves a candidate
to the shortlist. Expensive AI research does not run until Deniz requests it.

### UJ-3: Deniz researches a stock or ETF in context

The workspace identifies the instrument type, creates a Research Evidence
Snapshot, and presents asset-specific analytics, charts, company or fund
evidence, relevant news, macro context, benchmark comparisons, and missing-data
warnings. Stock PEG appears only when eligibility gates pass; ETFs use their
own evaluation model.

### UJ-4: Deniz makes an auditable portfolio decision

Deniz reviews Investment Quality and Portfolio Fit as separate results. The
Decision Card shows the deterministic label, Evidence Strength, policy
conflicts, risk limits, rationale, counter-thesis, and replay metadata. If
mandatory evidence is missing, the result becomes `Watch - Insufficient
Evidence` and suppresses directional output and suggested weight.

### UJ-5: Deniz monitors the thesis without signal noise

Deniz receives a daily summary and high-priority alerts only for approved
material event classes. Each alert links to new evidence and the prior decision
context. Duplicate or unsupported high-severity alerts are blocked. Alerting
failure does not erase event history or disable research.

### UJ-6: Deniz opts into bounded personalization after V1

After sufficient explicit decisions and observation time, Deniz may consent to
personalization. The system first runs in shadow mode and exposes proposed
effects. Deniz can inspect, correct, export, reset, or delete personal-model
data. User Policy and deterministic limits remain authoritative.

## 5. Innovation & Novel Patterns

The product does not claim novelty from using AI or common financial ratios.
Its differentiation is the disciplined combination of patterns that are often
separated or implemented unsafely:

### 5.1 Evidence-Native Decisions

Every retained decision binds field-level provenance, freshness, conflicts,
missingness, formula versions, Portfolio State, User Policy, benchmark, and
model versions into a replayable key.

### 5.2 Two-Layer Decision Model

Investment Quality answers whether an asset is attractive on its own.
Portfolio Fit answers whether and how it belongs in this portfolio. Neither may
silently overwrite the other.

### 5.3 PEG With Eligibility and Quality Gates

Target-Horizon PEG is the primary growth-adjusted valuation metric for eligible
stocks, but it is not a verdict. It uses explicit horizon alignment, estimate
coverage, dispersion, growth, peer, and quality gates and never applies to
ETFs.

### 5.4 Deterministic Core, AI Attachment

The structured Decision Result is deterministic. AI produces an optional,
sourced Narrative Attachment containing explanation, counter-thesis,
catalysts, risks, scenarios, and missing-evidence interpretation without
changing the result.

### 5.5 Bounded Personal Policy Learning

Post-V1 personalization learns only from explicit, consented behavior. It can
rank eligible candidates and propose bounded soft-policy adjustments, but it
cannot change evidence, standalone Investment Quality, minimum-evidence rules,
or hard portfolio constraints.

## 6. Developer Tool Specific Requirements

This is not a developer-tool product. This section records brownfield platform,
contract, and AI implementation constraints that downstream engineering work
must preserve.

### 6.1 Runtime and Contract Constraints

- Preserve the Spring Boot backend, FastAPI data-service, and React frontend.
- Preserve fixed development ports and the `/api/v1` backend boundary.
- Keep the backend domain framework-free and access infrastructure through
  ports and adapters.
- Keep provider normalization and pure analytics in the data-service; agents
  receive pre-calculated metrics and do not fetch authoritative data.
- Keep frontend data fetching in hooks and preserve backend/frontend contract
  alignment.
- Existing public endpoint paths or DTO fields may change only through a
  coordinated migration across all consumers.
- Target Decision Result semantics must not silently reinterpret any legacy
  decision or confidence contract discovered by the current-state audit.

### 6.2 Data and Degradation Constraints

- Preserve DB-first price loading, provider fallback, and persistence.
- Preserve cache-before-agent behavior where applicable.
- Provider failures return partial, empty, or explicitly unavailable data;
  they never create fake values.
- Technical analysis requires at least 30 candles.
- Journal, watchlist, portfolio, decision, and personalization state must
  persist through defined ports rather than process memory.
- API keys and licensed-provider credentials never reach the frontend.

### 6.3 AI Constraints

- AI consumes versioned calculated evidence only.
- AI cannot calculate authoritative metrics, fill missing evidence, change a
  label, relax a hard limit, or write a transaction.
- LLM failure leaves the deterministic product path usable.
- AI narrative, personalization, alerts, and providers require independent
  kill switches that preserve retained history.

### 6.4 Repository Quality Constraints

- Applied database migrations are immutable; schema changes use new migrations.
- New domain behavior, endpoints, and analytics require tests near the changed
  behavior.
- Provider tests use stubs or wire-level mocks and never call live financial
  APIs.
- User-facing pages preserve accessible contrast, visible keyboard focus, and
  semantic controls under existing frontend rules.

## 7. Development Roadmap & Risk

### 7.1 Delivery Roadmap

| Stage | Outcome | Capabilities |
|---|---|---|
| Phase 0 — Current Reality | Audit the brownfield implementation and publish current-state evidence | Verification only |
| V1 Foundation | Trusted evidence, ledger portfolio, asset research, and portfolio-aware decision | `CAP-TGT-001`–`004` |
| V1 Completion | Discovery, optional AI explanation, and monitoring; completes Value MVP | `CAP-TGT-005`–`007` |
| Post-V1 Personalization | Consented, bounded personal policy learning | `CAP-TGT-008` |
| Post-V1 Scale | Read-only broker reconciliation and SaaS identity/operations | `CAP-TGT-009`–`010` |

Release progression is:

```text
Internal Validation
  -> Owner Alpha
  -> Isolated Invite-Only Evaluation
  -> Value MVP Release
```

No paid release is authorized before `CAP-TGT-010` and its commercial,
privacy, security, support, and isolation gates pass.

### 7.2 Promotion to Implemented Contract

A requirement may be described as implemented only after:

1. the current-state baseline identifies its prior state;
2. the capability gap map assigns one owning epic and acceptance evidence;
3. implementation and required migrations are complete;
4. applicable automated tests and smoke scenarios pass; and
5. E3 evidence records command, result, date, environment, and locator.

### 7.3 Key Dependencies

- Licensed point-in-time security master and instrument classification.
- Rights-compatible market, fundamentals, estimates, benchmark, ETF
  holdings/NAV, corporate-action, news, macro, and event data.
- Defined mandatory evidence fields and freshness windows per asset model.
- Versioned financial formula and normalization policies.
- Ledger-derived Portfolio State and Portfolio Fit methodology.
- Qualified legal review for launch jurisdiction and personalized output.
- Production identity and isolation before shared or paid operation.
- Current-state baseline, product-doc validator, and capability gap map before
  final epic decomposition.

### 7.4 Decision Register and Phase Gates

An `Approved` requirement is accepted target scope, not permission to author
implementation stories or expose the output. The closure artifact named below
must be approved, versioned, and linked from the affected story before its
implementation acceptance criteria can be finalized. Role owners are assigned
for planning; a named human approver must be recorded in each closure artifact.

| Decision | Owner / approver | Due milestone and required evidence | Affected requirements and blocked stage |
|---|---|---|---|
| **OQ-1 — jurisdiction and product classification** | Product Lead / qualified counsel | Before external-evaluation design freeze: signed `LegalApprovalRecord`, `DisclosureVersion`, approved output/profile schema, jurisdiction and effective period, counsel analysis of profile refresh, inconsistent inputs, and reasonably available alternatives where applicable. | `PRD-FR-055`, `PRD-NFR-009`, `PRD-FR-071`; external policy-conditioned labels/weights and external evaluation remain blocked. |
| **OQ-2 — licensed data rights** | Data Governance Lead / legal and provider-contract owner | Before any external data display or retained evaluation: versioned `DataRightsApproval` per dataset and use, agreement locator, territory/audience, professional status if applicable, effective/expiry/revocation dates, permitted transformations, reporting duties, and delay labels. | `PRD-FR-003`, `PRD-FR-058`, `PRD-FR-072`, `PRD-NFR-008`; affected provider-backed external use remains blocked. |
| **OQ-3 — stock/ETF evidence policy** | Quant Research Lead / Risk Lead | Before Evidence Strength or Decision Result story acceptance: versioned separate asset-model policy declaring applicable mandatory fields, optional field weights, freshness windows, conflict priorities, and independent boundary fixtures. | `PRD-FR-006`–`009`, `PRD-FR-027`–`029`, `PRD-FR-065`; Evidence Strength and directional decisions remain blocked. |
| **OQ-4 — financial and risk policy** | Quant Research Lead / Risk Lead and Product Lead | Before PEG scoring, Portfolio Fit, labels, or weights: versioned normalized-EPS, target-date consensus, peer/lifecycle, quality-gate, correlation/drawdown, marginal-impact, and weight-cap policies with formulas, units, boundaries, and independently calculated fixtures. | `PRD-FR-020`–`025`, `PRD-FR-028`–`029`, `PRD-FR-059`–`066`; PEG-dependent decisions and action labels/weights remain blocked. |
| **OQ-5 — legacy contract migration** | Backend Lead / Architecture Lead | Before affected API/story implementation: source-to-target DTO/route compatibility matrix with `CAP-CUR-*` and `DOC-CONFLICT-*` references, explicit preserve/version/coordinated-migration/retire disposition, all-consumer test plan, and compatibility window. | `PRD-FR-003`, `PRD-FR-027`, `PRD-NFR-015`; affected contract changes remain blocked. |
| **OQ-6 — economics** | Product Lead / Finance Lead | Before each cohort expansion: approved monthly AI and licensed-data budget; pricing and gross-margin floor before any paid release. | `PRD-NFR-013`, `PRD-FR-053`; cohort expansion or paid release remains blocked when its budget is absent. |
| **OQ-7 — measurement** | Product Analytics Lead / Product Lead | Before using any success metric as a gate: versioned metric dictionary, event schema, exclusions, survey wording, sample and confidence rules, and data-quality audit. | `PRD-NFR-011`–`013`; metric-based cohort promotion remains blocked. |
| **OQ-8 — cohort gates** | Product Operations Lead / Product and Risk Leads | Before Owner Alpha, invite-only, or Value MVP expansion: signed gate record with cohort floor, observation window, entry/exit/stop/rollback thresholds, incident owner, and cost/trust evidence. | `PRD-NFR-017`, `PRD-NFR-019`–`023`; corresponding cohort expansion remains blocked. |

### 7.5 Delivery Readiness

Requirements that depend on OQ-1 through OQ-8 retain their scope status but
are `Blocked` for the stated activity until the closure artifact passes. A
gap-map row records one `Ready`, `Blocked`, or `Deferred` delivery-readiness
value and the owning epic. This prevents an approved target from being read as
an implemented or implementation-ready contract. Policy artifacts must be
frozen before fixture outcomes are inspected; a later revision creates a new
version and does not rewrite a retained decision.

### 7.6 External Cohort Stage Gates

| Stage | Entry and minimum observation | Exit evidence | Stop and rollback consequence |
|---|---|---|---|
| Internal Validation | Local fixtures and contract checks; no external user minimum. | All applicable tests green; baseline, gap map, data-rights and legal decisions identified. | Any fabricated value, replay mismatch, or hard-limit violation stops the build. |
| Owner Alpha | One named internal owner; at least seven days of instrumented use after entry checks. | Approved metric dictionary and budget; no critical evidence or privacy failure; documented issue triage. | Revert the affected feature flag and preserve retained evidence/history on a failing trust gate. |
| Isolated Invite-Only Evaluation | Proposed floor of 30 consented users with at least 14 days of observation; approval under OQ-8 required. Valid legal/data-rights records and isolated access/security/recovery tests precede invitation. | `SM-1`–`SM-7` measured on approved populations and floors; no release blocker; documented incident exercise. | Stop invitations, disable affected labels/AI/alerts/provider, and retain audit history on any legal, security, privacy, or evidence breach. |
| Value MVP Release | Proposed floor of 100 consented evaluation users with at least 30 days of observation; OQ-8 approval required. | Approved `SM-1`–`SM-7` gate decisions, budget, backup/restore evidence, support/incident owner, and no open release blocker. | Pause rollout and restore the last approved version when a hard trust gate fails; preserve prior decision and ledger history. |

No stage may be declared passed from a sample below its approved floor or
from an unapproved metric definition. `SM-8` and `SM-9` govern the later
personalization stage and never authorize an earlier MVP release.

### 7.7 Assumptions

- **A-1:** Minimum explicit User Policy is a V1 Foundation dependency; learned
  personalization remains Post-V1.
- **A-2:** Users will accept manual or CSV onboarding before broker sync.
- **A-3:** The restricted U.S. stock and eligible-ETF universe is sufficient to
  prove Value-MVP demand.
- **A-4:** Rights-compatible point-in-time data can be licensed within an
  approved cost envelope.
- **A-5:** Target-horizon consensus estimates and comparable peer sets will be
  sufficiently available for the PEG policy.
- **A-6:** Enough consented Decision Events will exist to evaluate
  personalization without psychological inference or LLM fine-tuning.
- **A-7:** Qualified counsel will permit at least objective research and Portfolio
  Fit in the first external evaluation; action labels and weights remain gated.

### 7.8 Review Dispositions

The five review/reconciliation inputs are historical review evidence. The
disposition below addresses each blocker/high finding at the PRD level;
`Deferred` means the target contract is recorded but the named approval still
blocks the affected story or release. `Resolved` does not assert runtime
implementation. The capability gap map carries the current-contract
`DOC-CONFLICT-*` links and migration treatment.

- Disposition: The following table is the authoritative Plan 4 review
  disposition register for this PRD revision.

| Finding | Disposition | PRD closure locator and remaining gate |
|---|---|---|
| `RF-01`, `RF-02` | Resolved | §2.1–2.4 restore activation, denominator, and workflow definitions; OQ-7/8 approve instrumentation floors. |
| `RF-03`, `FIN-02` | Resolved | `PRD-FR-028`, `PRD-FR-047` retain ownership/transition rules; OQ-3/4 gate policy fixtures. |
| `RF-04`, `FIN-03` | Resolved | `PRD-FR-019`, `PRD-FR-056`–`058` define benchmark hierarchy and freeze. |
| `RF-05`, `FIN-04` | Resolved | `PRD-FR-020`–`023`, `PRD-FR-059`–`064` define PEG calculation, exclusion, peer, quality, and approval gates. |
| `RF-06`, `FIN-06` | Resolved | `PRD-FR-044`–`049` and `PRD-FR-067`–`070` preserve explicit labels, consent, lifecycle, and fallback. |
| `RF-07` | Resolved | `PRD-FR-041` bounds high-priority event classes. |
| `RF-08` | Resolved | §3.1–3.3 and `PRD-FR-011`–`015` define one initial user portfolio and approved ledger outputs; multi-portfolio/cash accounting is not a V1 obligation. |
| `RF-09` | Resolved | `PRD-FR-033` requires explanations only for returned screen results; rejection notes are optional. |
| `RF-10` | Deferred | §6.4 retains repository UI accessibility conventions; §8.2 leaves jurisdiction-specific disclosure duties to OQ-1 qualified-counsel approval. |
| `RF-11` | Resolved | §1 and §3.2 retain separate Medium/Long outlooks without an unapproved primary-horizon priority. |
| `RF-12` | Resolved | §1.1 and the Plan 3 baseline now supply audited current contracts; OQ-5 handles the remaining migration decision. |
| `FIN-01` | Deferred | `PRD-FR-055`, `PRD-FR-071`, `PRD-NFR-009`, §8.2 specify the gate; OQ-1 requires qualified-counsel approval before external policy-conditioned output. |
| `FIN-05` | Resolved | `PRD-FR-008` requires `Insufficient` for critical conflicts and weighted model-specific coverage. |
| `FIN-07` | Resolved | `PRD-NFR-014`, `PRD-NFR-018`, §11.1 require independent metric/outcome fixtures. |
| `BR-01` | Resolved | §1.1/7.2 require the Plan 3 baseline and complete `CAPABILITY_GAP_MAP.md`; the map now contains one row per requirement and has passed validation. |
| `BR-02` | Resolved | §7.4–7.5 separate scope status from delivery readiness and name OQ owners/closure artifacts. |
| `BR-03` | Resolved | `PRD-FR-019`/`056`–`058`, `PRD-FR-022`/`059`, `PRD-FR-023`/`060`–`064`, `PRD-FR-048`/`067`–`070`, and `PRD-NFR-014`/`018` split independent obligations. |
| `BR-04` | Deferred | Gap-map rows now cite current evidence and conflict IDs; OQ-5 and `PRD-NFR-015` still require per-contract preserve/version/coordinated-migration/retire decisions before affected story authoring. |
| `RFN-01` | Deferred | `PRD-FR-025`, `PRD-FR-065`–`066`, §7.4 cover required fields and effects; OQ-4 must approve marginal-impact/weight-cap policies. |
| `RFN-02` | Deferred | §8.2, `PRD-FR-055`, `PRD-FR-071`–`072` define replay-bound records; OQ-1/2 approvals remain external gates. |
| `RFN-03` | Resolved | `PRD-FR-058` and §11.1 freeze benchmark selection before outcomes. |
| `RFN-04` | Deferred | `PRD-FR-061` separates provider/trailing PEG; `PRD-FR-064` blocks scoring until OQ-4 approval. |
| `RFN-05` | Deferred | `PRD-FR-008` restores weighted optional coverage; OQ-3 must approve field weights and thresholds before implementation. |
| Rubric: phase-question closure | Resolved | §7.4 assigns owner, approver, due milestone, evidence, affected IDs, and blocked stage for OQ-1–8. |
| Rubric: metric and cohort gates | Deferred | §2.4 and §7.6 define populations, events, windows, proposed floors, owners, stop/rollback; OQ-7/8 must approve final gates before expansion. |
| Rubric: external security/operations | Deferred | `PRD-NFR-019`–`023` and §7.6 establish isolated-access, security, backup, recovery, and incident evidence before invitations. |
| Rubric: core FR readiness | Deferred | §7.4–7.5 and gap-map readiness keep OQ-3/4/5-dependent stories blocked. |
| Rubric: baseline/gap map | Resolved | The Plan 3 baseline and `CAPABILITY_GAP_MAP.md` now exist; all 95 requirements have one primary row and the validator passes. |

## 8. Risk Mitigation

### 8.1 Product and Delivery Risks

| Risk | Impact | Required mitigation |
|---|---|---|
| Product is classified as regulated advice | Personalized labels or weights may require registration or additional controls | Qualified-counsel gate; objective research and counsel-approved Portfolio Fit only until approved |
| Data rights do not permit required use | Evidence or discovery cannot ship | Provider-rights register and security-master/data gate before external evaluation |
| PEG or another ratio creates false precision | Users over-weight a noisy metric | Eligibility, peer, quality, Evidence Strength, and no single-metric `Add` |
| Current contracts conflict with target semantics | Contract drift or misleading migration | Current-state audit plus versioned contract or coordinated migration |
| Provider or LLM failure becomes neutral evidence | Unsafe conclusions and loss of trust | Explicit section status and fail-closed mandatory evidence |
| Personalization overfits sparse behavior | Policy drift or unsuitable output | Minimum history, shadow mode, bounded learner, control group, and hard-limit tests |
| AI and licensed-data cost exceeds value | Cohort expansion becomes unsustainable | Deterministic narrowing, user-triggered AI, cost telemetry, and stage budgets |
| Target requirements are mistaken for current behavior | Planning and release errors | Baseline, gap map, E3 evidence, and promotion rules |

### 8.2 Regulatory and Data-Rights Gates

This section defines release gates, not a legal conclusion. Product
classification and jurisdiction-specific duties require qualified counsel.

- Every external user-policy-conditioned action label or suggested weight,
  whether learned or deterministic, requires a valid jurisdiction-specific
  `LegalApprovalRecord`. Without it, the external product exposes only
  objective research and a counsel-approved, non-action-oriented form of
  Portfolio Fit if that form is approved.
- `LegalApprovalRecord` and `DisclosureVersion` must identify jurisdiction,
  product/output and required profile-schema versions, permitted output types,
  disclosure and operating-control versions, effective/expiry/revocation
  state, approval evidence locator, retention rules, and profile refresh and
  inconsistency procedures. Every gated result and retained replay/audit
  record binds the versions that were valid at output time.
- Product disclosures must accurately describe scope, material assumptions,
  limitations, data used, and update expectations without implying
  comprehensive financial, tax, debt, or cash-flow planning.
- Missing evidence or required policy inputs suppress the affected output; a
  disclaimer cannot replace the missing input.
- A `DataRightsApproval` record must bind dataset/product, agreement locator,
  territory/audience, professional status where relevant, effective period,
  expiry/revocation, permitted collection/display/cache/derived/backtest/model/
  redistribution uses, reporting duties, and required delay labels. Every
  provider-backed external result binds its applicable rights version.
- API availability or the absence of an API key is not evidence of commercial
  use or redistribution rights.

Official SEC, FINRA, Nasdaq, and NYSE materials in References inform these
release gates. They do not determine the product's legal classification.

### 8.3 Release Blockers

Release is blocked by any applicable failing test, fabricated value,
untraceable retained decision, replay mismatch, duplicate CSV ledger import,
privacy failure, cross-user exposure, hard-policy violation, missing or expired
data-rights approval, missing or expired legal approval for the affected
output, or absent approved Evidence Strength, Portfolio Fit, or deterministic
weight-cap policy when those results are required.

## 9. Functional Requirements

Each requirement belongs to exactly one target capability. `Approved` means it
is part of the target product; it does not mean it is implemented. `Deferred`
requirements remain outside V1.

### 9.1 Trusted Evidence — `CAP-TGT-001`

| ID | Status | Requirement | Acceptance evidence |
|---|---|---|---|
| `PRD-FR-001` | Approved | The system SHALL restrict V1 equity research and discovery to NYSE- and Nasdaq-listed U.S. common equities. | Point-in-time fixtures accept eligible common equities and reject unsupported types. |
| `PRD-FR-002` | Approved | The system SHALL restrict V1 ETF research and discovery to transparent, non-leveraged, non-inverse U.S. equity ETFs with daily NAV. | Fixtures reject leveraged, inverse, opaque-holdings, commodity, and crypto-linked products. |
| `PRD-FR-003` | Approved | The system SHALL resolve universe membership and instrument type from a licensed point-in-time security master and fail closed when type is unresolved. | An unresolved symbol is never defaulted to `STOCK`. |
| `PRD-FR-004` | Approved | The system SHALL represent Tactical Context, Medium Term, and Long Term separately using Section 3.2 ranges. | Every horizon-bearing result has one valid horizon identifier and no unexplained blended score. |
| `PRD-FR-005` | Approved | The system SHALL create an immutable Research Evidence Snapshot for each retained evaluation and decision. | Each retained result resolves to one snapshot; revision creates a new snapshot. |
| `PRD-FR-006` | Approved | Each decision-critical evidence field SHALL record source, observation time, retrieval time, period, currency, normalization version, freshness, conflict state, and missingness. | Contract and persistence tests prove complete mandatory metadata. |
| `PRD-FR-007` | Approved | The system SHALL expose missing, stale, conflicted, and unavailable evidence without substituting zero, neutral sentiment, fair valuation, or synthetic values. | Provider-failure fixtures preserve valid sections and explicit unavailable states. |
| `PRD-FR-008` | Approved | Separate versioned stock and ETF evidence policies SHALL declare applicable mandatory fields, optional-field weights, freshness windows, and conflict priorities. Evidence Strength SHALL be deterministic: `High` requires current mandatory fields, no unresolved critical conflict, and at least 90% weighted optional coverage; `Medium` requires the same hard gates and at least 75% weighted optional coverage; `Low` permits lower weighted coverage or allowed optional staleness/conflict; mandatory failure, unresolved type, or critical conflict yields `Insufficient`. | Boundary and mutation fixtures cover every level, weighted thresholds, stale mandatory fields, unresolved type/conflict, and prove that adding low-weight fields cannot mask missing material fields. OQ-3 approval gates story acceptance. |
| `PRD-FR-009` | Approved | Each evidence section SHALL expose `OK`, `STALE`, `EMPTY`, `FAILED`, `RATE_LIMITED`, `INSUFFICIENT_DATA`, or `PENDING_REFRESH`. | API and UI tests cover each status without converting it to investment evidence. |
| `PRD-FR-010` | Approved | Provider failure SHALL preserve verified sections and SHALL never fabricate market data. | Failure tests return partial or unavailable output with no synthetic value. |
| `PRD-FR-072` | Approved | Every externally used provider dataset SHALL have a versioned `DataRightsApproval` binding dataset/product, agreement locator, audience/territory, professional status where relevant, permitted uses, reporting/delay duties, effective period, and revocation state to the rendered result. | Rights fixtures reject unauthorized display, derived analytics, backtests, model use, redistribution, missing delay labels, and expired/revoked rights. |

### 9.2 Ledger Portfolio — `CAP-TGT-002`

| ID | Status | Requirement | Acceptance evidence |
|---|---|---|---|
| `PRD-FR-011` | Approved | The user SHALL be able to create a portfolio through manual transaction entry. | Valid transactions persist through restart with stable identifiers. |
| `PRD-FR-012` | Approved | CSV import SHALL use staging, schema validation, normalization, duplicate detection, and user-visible reconciliation before acceptance. | Invalid/conflicting rows remain staged; accepted rows retain lineage. |
| `PRD-FR-013` | Approved | Re-importing the same transaction data SHALL be idempotent. | Re-import creates no duplicate ledger entry, holding, or realized activity. |
| `PRD-FR-014` | Approved | Portfolio State SHALL be derived from the immutable transaction ledger rather than stored as independent process memory. | Restart and replay reproduce holdings, cost basis, realized activity, and exposures. |
| `PRD-FR-015` | Approved | Every Portfolio Fit and Decision Result SHALL reference the exact Portfolio State version used. | Replay resolves the same Portfolio State and structured result. |

### 9.3 Asset Research — `CAP-TGT-003`

| ID | Status | Requirement | Acceptance evidence |
|---|---|---|---|
| `PRD-FR-016` | Approved | The product SHALL combine asset-specific fundamentals, estimates, price/risk evidence, relevant news, sector context, macro context, benchmark evidence, and charts in one workflow. | Each section exposes source/freshness status and preserves missingness. |
| `PRD-FR-017` | Approved | Stock evaluation SHALL cover growth, revisions, ROIC, free-cash-flow growth/conversion, margin durability, leverage, dilution, earnings quality, valuation, momentum, volatility, drawdown, and benchmark-relative performance. | Independent fixtures test each formula, unit, period, rounding, eligibility, and missing-data behavior. |
| `PRD-FR-018` | Approved | ETF evaluation SHALL cover expense ratio, liquidity/spread, tracking, holdings concentration, methodology, exposure, premium/discount, and category-relative risk without stock-only ratios. | ETF fixtures prove stock PEG and stock-only quality metrics are absent. |
| `PRD-FR-019` | Approved | A U.S. common stock SHALL use the S&P 500 total-return index as its primary benchmark. | Stock benchmark fixtures verify the total-return series and reject a price-only index. |
| `PRD-FR-020` | Approved | For an eligible stock, Target-Horizon PEG SHALL equal `(snapshot price / consensus EPS at the eligible target fiscal date) / exact fractional-period EPS CAGR in percentage points`. The target fiscal date SHALL be nearest 24 months and within `18–32 months`. The calculation record SHALL retain every input, unit, observation date, fiscal date, formula version, analyst count, and dispersion. | Hand-calculated fixtures reproduce the value and full calculation record. |
| `PRD-FR-021` | Approved | Target-Horizon PEG SHALL be `Not Meaningful` when normalized current or target EPS is non-positive, growth is at most 2%, fewer than three target-date estimates exist, or required inputs are unavailable. | Boundary tests cover negative/zero EPS, 2% growth, counts of two and three, and missing input. |
| `PRD-FR-022` | Approved | Target-Horizon PEG SHALL be `High Uncertainty` and excluded from scoring when growth exceeds 50% or estimate dispersion exceeds 50% of the absolute consensus mean. | Boundary tests cover growth and dispersion on both sides of each threshold. |
| `PRD-FR-023` | Approved | Neither a universal `PEG < 1` threshold nor PEG alone SHALL produce an `Add` label. | Decision fixtures reject a PEG-only `Add` even when PEG appears attractive. |
| `PRD-FR-056` | Approved | A U.S. common stock SHALL use a mapped GICS sector total-return index as its secondary benchmark; unresolved sector mapping SHALL suppress sector-relative calibration. | Sector mapping fixtures cover valid, stale, missing, and conflicted mappings. |
| `PRD-FR-057` | Approved | An ETF SHALL use its declared tracked index; only a predeclared category substitute may be used when rights prevent the declared index, with lower Evidence Strength and a recorded reason. Unresolved category mapping SHALL suppress benchmark-relative calibration. | ETF benchmark fixtures cover declared index, rights loss, permitted substitute, and unresolved mapping. |
| `PRD-FR-058` | Approved | Benchmark identifier, mapping-policy version, selection and observation timestamps, substitution reason, and rights state SHALL be frozen with the snapshot and retained decision/outcome records before outcomes are known; later remapping SHALL NOT rewrite retained evaluation. | Point-in-time fixtures attempt post-outcome remapping and cover delisting, category changes, discontinuation, and rights loss. |
| `PRD-FR-059` | Approved | A scored Target-Horizon PEG peer percentile SHALL require at least ten comparable peers under the approved peer/lifecycle policy. | Peer fixtures with nine and ten eligible members test scoring eligibility. |
| `PRD-FR-060` | Approved | Target-Horizon PEG SHALL NOT be calculated or displayed as an ETF evaluation metric. | ETF API/UI fixtures contain no stock PEG field or score. |
| `PRD-FR-061` | Approved | Any trailing or provider-supplied PEG SHALL have a distinct name and its own formula, source, and period; it SHALL NOT substitute for or enter Target-Horizon PEG scoring. | API/UI fixtures cover both values present, missing, conflicting, and stale without conflation. |
| `PRD-FR-062` | Approved | Target-Horizon PEG peer interpretation SHALL account for sector, business model, and life cycle and display estimate revisions, dispersion, and freshness. | Peer/lifecycle fixtures and UI tests show context or an explicit unavailable reason. |
| `PRD-FR-063` | Approved | PEG influence SHALL remain subordinate to approved ROIC, free-cash-flow, margin, leverage, dilution, and earnings-quality gates. | Decision fixtures show that a failed quality gate cannot be overturned by PEG. |
| `PRD-FR-064` | Approved | Target-Horizon PEG scoring and PEG-dependent label influence SHALL remain disabled until versioned normalized-EPS and peer/lifecycle policies receive OQ-4 approval. | Gate tests reject absent, expired, or mismatched policy versions. |

### 9.4 Decision and Portfolio Fit — `CAP-TGT-004`

| ID | Status | Requirement | Acceptance evidence |
|---|---|---|---|
| `PRD-FR-024` | Approved | Investment Quality SHALL be calculated independently of Portfolio State. | The same snapshot and horizon produce the same Investment Quality across portfolio fixtures. |
| `PRD-FR-025` | Approved | Portfolio Fit SHALL measure marginal effects on the exact Portfolio State under User Policy, including concentration, diversification, correlation, sector/factor overlap, liquidity, drawdown, and hard-limit interactions. Unacceptable effects SHALL block `Add`. | Independent boundary fixtures expose each effect and its blocking threshold separately; OQ-4 approves the versioned policy before labels/weights are accepted. |
| `PRD-FR-026` | Approved | V1 SHALL collect minimum User Policy covering risk tolerance, horizon, maximum position weight, sector limits, and exclusions before portfolio-aware output. | Missing or inconsistent policy suppresses affected output with a remediation state. |
| `PRD-FR-027` | Approved | Decision Result SHALL include snapshot, analytics, Portfolio State, User Policy, benchmark-selection, Portfolio Fit, decision-policy, and personal-model artifact identifiers or an explicit `none`, together with their versions. | The complete replay key reproduces an identical structured result and rejects a missing or mismatched version. |
| `PRD-FR-028` | Approved | Label semantics SHALL be: `Add` for owned or unowned assets eligible for a new/increased position within the hard cap; `Hold` only for owned assets when no change is supported; `Reduce` only for owned assets when exposure exceeds the supported level; `Avoid` only for unowned assets with negative evaluation or a blocking hard constraint; and non-directional `Watch` for owned or unowned assets. | A decision table covers owned/unowned state and rejects every invalid label. |
| `PRD-FR-029` | Approved | `Watch - Insufficient Evidence` SHALL suppress directional outlook, expected return, action-oriented Portfolio Fit, and suggested weight while showing available evidence, blocking gaps, current exposure when relevant, and reevaluation conditions. | Every mandatory evidence, classification, and policy-input failure reaches this suppression state. |
| `PRD-FR-030` | Approved | Narrative Attachment SHALL remain optional and SHALL NOT mutate Decision Result. | Decision Result hash is identical with AI enabled, disabled, timed out, or regenerated. |
| `PRD-FR-031` | Approved | The user SHALL be able to retain a decision with thesis, counter-thesis, invalidation conditions, and replay metadata. | A Decision Card reconstructs after provider data or policies change. |
| `PRD-FR-055` | Approved | Every external user-policy-conditioned action label or suggested weight SHALL require a valid jurisdiction-specific legal approval record, whether or not learned personalization is active. Without approval, external output SHALL be limited to objective research and a counsel-approved non-action Portfolio Fit shape when permitted. | Release fixtures reject wrong jurisdiction, expiry/revocation, unapproved output/product version, and missing profile schema, including when no personal model exists. |
| `PRD-FR-065` | Approved | The deterministic Decision Result SHALL expose separate Medium-Term and Long-Term outlooks, valuation zone, supported maximum weight or a suppression reason, strongest quantitative support, quantitative risk flags, and the applied label. | Contract fixtures assert every field and verify no LLM output can change it. |
| `PRD-FR-066` | Approved | A retained Decision Result SHALL expose versioned quantitative invalidation thresholds and their evidence/observation context. | Replay fixtures reconstruct threshold values and show reevaluation when new evidence crosses one. |
| `PRD-FR-071` | Approved | Each gated external result and retained replay/audit record SHALL bind the effective `LegalApprovalRecord` and `DisclosureVersion`, including jurisdiction, approved product/output and profile schema, effective/expiry/revocation state, and approval locator. | Contract and release fixtures reject mismatched or expired versions and preserve the applicable historical approval in replay. |

### 9.5 Explainable Discovery — `CAP-TGT-005`

| ID | Status | Requirement | Acceptance evidence |
|---|---|---|---|
| `PRD-FR-032` | Approved | The system SHALL screen the supported universe through deterministic, versioned filters before candidate AI runs. | A screen replays from universe/rule versions without an LLM. |
| `PRD-FR-033` | Approved | Each returned screen result SHALL explain why it matched and expose evidence status; user rejection notes are optional. | Every returned candidate has rule/evidence reasons without requiring explanations for the full excluded universe. |
| `PRD-FR-034` | Approved | The user SHALL be able to save, remove, and optionally annotate candidates and launch deeper research from the shortlist. | Shortlist survives restart and retains the originating screen version. |
| `PRD-FR-035` | Approved | Cost-intensive AI research SHALL run only for a user-selected candidate. | Each AI run maps to an explicit request and candidate. |

### 9.6 AI Explanation — `CAP-TGT-006`

| ID | Status | Requirement | Acceptance evidence |
|---|---|---|---|
| `PRD-FR-036` | Approved | AI SHALL receive pre-calculated metrics and evidence references and SHALL NOT fetch authoritative market data inside an agent. | Boundary tests accept only defined evidence contracts. |
| `PRD-FR-037` | Approved | Narrative Attachment MAY explain thesis, counter-thesis, catalysts, risks, scenarios, missing evidence, and policy conflicts. | Factual narrative claims link to snapshot evidence; interpretation is labeled. |
| `PRD-FR-038` | Approved | AI SHALL NOT calculate authoritative metrics, alter results, override hard limits, fill missing evidence, or represent uncertainty as success probability. | Adversarial tests leave results and missingness unchanged. |
| `PRD-FR-039` | Approved | LLM failure SHALL leave deterministic research and Decision Result usable. | Timeout, refusal, malformed output, and outage return structured output without synthetic narrative. |

### 9.7 Monitoring — `CAP-TGT-007`

| ID | Status | Requirement | Acceptance evidence |
|---|---|---|---|
| `PRD-FR-040` | Approved | The product SHALL provide a daily summary of material evidence changes for retained decisions, portfolio holdings, and shortlisted assets. | Eligible changes appear within 24 hours of ingestion with prior/new evidence. |
| `PRD-FR-041` | Approved | High-priority alerts SHALL be limited to earnings or regulatory filings, deterministic portfolio-limit breaches, provider-confirmed corporate events, and critical evidence-staleness events. Adding an event class requires an approved PRD change. | Unsupported, ordinary-news, unverified, and stale events cannot produce high severity. |
| `PRD-FR-042` | Approved | Materially equivalent alerts SHALL be deduplicated while preserving event history. | Duplicate rate remains below 2% and underlying events remain auditable. |
| `PRD-FR-043` | Approved | Alert delivery and generation SHALL be independently disableable without disabling research or deleting event history. | Failed alert gates disable high-priority alerting and preserve deterministic research/history. |

### 9.8 Personal Investment Policy — `CAP-TGT-008`

| ID | Status | Requirement | Acceptance evidence |
|---|---|---|---|
| `PRD-FR-044` | Approved | Decision Events SHALL be captured for learning only after revocable informed consent, reference point-in-time inputs, and retain every displayed alternative including rejected alternatives. | No learning event exists before consent; each training event includes its candidate set and provenance. |
| `PRD-FR-045` | Approved | Learning SHALL be limited to pairwise ranking among deterministically eligible candidates and bounded soft-policy calibration. Passive views/clicks are diagnostic only, model-generated rankings cannot become labels without explicit confirmation, and cross-user behavioral training or feature transfer remains disabled. | Training-set tests reject passive/self-generated labels and any cross-user example. |
| `PRD-FR-046` | Approved | Ranking eligibility SHALL require at least 20 explicit decisions across eight weeks and four weeks of shadow mode; label/weight influence SHALL additionally require at least 30 decisions matured through a three-month window, zero hard-policy violations, and user approval. | Eligibility tests exercise every threshold and fail when any gate is absent. |
| `PRD-FR-047` | Approved | A personal model SHALL emit only a versioned adjustment proposal. With at least `Medium` Evidence Strength and no hard-limit violation, backend policy MAY apply only `Add→Watch`, `Watch→Add` when base quality is positive, `Hold→Add`, `Hold→Reduce`, `Reduce→Hold`, or `Avoid→Watch`. It SHALL NOT change `Avoid→Add`, `Reduce→Add`, or `Watch - Insufficient Evidence`. It may lower but never raise a deterministic or explicit weight cap. | Property tests reject every unlisted transition and every cap increase. |
| `PRD-FR-048` | Approved | The user SHALL be able to inspect and export personal policy, decision events, model artifacts, and retained Decision Results. | Access/export fixtures reconcile user-visible records with active stores and omit other users' data. |
| `PRD-FR-049` | Approved | Model timeout, drift, insufficient history, reset, deletion, consent withdrawal, or any hard-policy violation SHALL disable learned influence and restore explicit-policy output. | Every failure mode returns deterministic explicit-policy behavior. |
| `PRD-FR-067` | Approved | The user SHALL be able to correct and reset personal policy inputs and learned model state without modifying immutable historical evidence. | Correction/reset fixtures create new versions and preserve prior retained decision replay. |
| `PRD-FR-068` | Approved | The user SHALL be able to withdraw learning consent; withdrawal SHALL stop new learning and learned influence while core portfolio research remains available. | Privacy tests prove no post-withdrawal training event or personalized output and continued deterministic access. |
| `PRD-FR-069` | Approved | A deletion request SHALL remove active decision events, derived features, personal snapshots, model artifacts, narratives, exports, caches, personal Decision Results, and replay keys; only a non-identifying deletion receipt remains. | Store-by-store fixtures prove removal and replay termination only for deleted personal results. |
| `PRD-FR-070` | Approved | Backup copies of deleted personal data SHALL be cryptographically erased or expire within 30 days unless an approved legal duty requires retention; held records SHALL be minimized, restricted, excluded from serving/training, disclosed, and deleted when the duty ends. | Backup expiry, legal-hold isolation, duty-expiry, and audit-receipt fixtures pass. |

### 9.9 Broker Synchronization — `CAP-TGT-009`

| ID | Status | Requirement | Acceptance evidence |
|---|---|---|---|
| `PRD-FR-050` | Deferred | Broker integration SHALL be read-only, stage external records, and reconcile them with the ledger without silent overwrite. | Tests prove explicit conflict resolution and no broker write capability. |
| `PRD-FR-051` | Deferred | Broker synchronization SHALL NOT create or execute trade orders. | Security tests prove no order-write permission or endpoint. |

### 9.10 SaaS Identity and Operations — `CAP-TGT-010`

| ID | Status | Requirement | Acceptance evidence |
|---|---|---|---|
| `PRD-FR-052` | Deferred | Production SaaS SHALL provide authenticated ownership and tenant isolation for every portfolio, decision, event, model artifact, cache entry, and export. | Isolation tests cover storage, cache, jobs, logs, and exports. |
| `PRD-FR-053` | Deferred | Shared operations SHALL include subscription, pricing, entitlement, support, and cost controls before paid release. | Paid activation remains blocked until the commercial/operational suite passes. |
| `PRD-FR-054` | Deferred | Migration from isolated deployments SHALL preserve ownership, consent, provenance, and replay identifiers. | Migration fixtures reconcile user-scoped records without collision or exposure. |

## 10. Non-Functional Requirements

| ID | Primary capability | Status | Requirement and measurable boundary |
|---|---|---|---|
| `PRD-NFR-001` | `CAP-TGT-001` | Approved | One hundred percent of decision-critical fields and at least 95% of all displayed evidence fields SHALL expose source and freshness metadata. |
| `PRD-NFR-002` | `CAP-TGT-001` | Approved | Evidence snapshots SHALL be immutable; revisions create new snapshots and retain prior versions. |
| `PRD-NFR-003` | `CAP-TGT-004` | Approved | The complete replay key SHALL reproduce an identical structured Decision Result; Narrative Attachments are excluded from deterministic equality. |
| `PRD-NFR-004` | `CAP-TGT-004` | Approved | Authoritative analytics, Investment Quality, Portfolio Fit, and decision policy SHALL be deterministic, versioned, and independently testable. |
| `PRD-NFR-005` | `CAP-TGT-001` | Approved | Provider, LLM, or personal-model failure SHALL NOT disable the deterministic core, convert missing data to neutral evidence, or fabricate values. |
| `PRD-NFR-006` | `CAP-TGT-008` | Approved | Personal data SHALL support access, correction, export, consent withdrawal, and deletion across active and derived stores, subject only to documented legal holds. |
| `PRD-NFR-007` | `CAP-TGT-010` | Deferred | Multi-user operation SHALL prevent cross-user access in storage, cache, jobs, telemetry, support tooling, and exports. |
| `PRD-NFR-008` | `CAP-TGT-001` | Approved | External evaluation SHALL remain blocked until provider rights cover collection, display, caching, analytics, backtesting, model use, redistribution, and required delay labels. |
| `PRD-NFR-009` | `CAP-TGT-004` | Approved | External user-policy-conditioned action labels or weights SHALL remain disabled without a valid jurisdiction-specific legal approval record, regardless of personal-model use. |
| `PRD-NFR-010` | `CAP-TGT-007` | Approved | AI narrative, personalization, alerts, and each provider SHALL have independent kill switches that preserve retained history. |
| `PRD-NFR-011` | `CAP-TGT-003` | Approved | The first Meaningful Research Result SHALL be reachable in under ten minutes in the defined evaluation environment. |
| `PRD-NFR-012` | `CAP-TGT-007` | Approved | Eligible daily-summary and alert changes SHALL be available within 24 hours of successful ingestion. |
| `PRD-NFR-013` | `CAP-TGT-006` | Approved | AI and licensed-data cost SHALL be measured separately per Activated User and retained user; cohort expansion requires an approved monthly variable-cost budget. |
| `PRD-NFR-014` | `CAP-TGT-004` | Approved | Every authoritative financial and portfolio calculation SHALL have independent, versioned expected-value fixtures documenting formula, unit, period, and rounding, including missing, stale, conflicting, restated, and corporate-action cases. |
| `PRD-NFR-015` | `CAP-TGT-004` | Approved | Public endpoint or DTO changes SHALL use a versioned or coordinated all-consumer migration based on verified current-state evidence; target semantics SHALL NOT silently reinterpret a legacy field. |
| `PRD-NFR-016` | `CAP-TGT-001` | Approved | Telemetry SHALL measure provider status, freshness, snapshots, replay failures, suppression, AI cost, alert quality, and policy violations without exposing secrets or unnecessary personal data. |
| `PRD-NFR-017` | `CAP-TGT-004` | Approved | Release SHALL be blocked by any applicable failing test, fabricated value, untraceable decision, replay mismatch, duplicate ledger import, privacy failure, cross-user exposure, or hard-policy violation. |
| `PRD-NFR-018` | `CAP-TGT-004` | Approved | Outcome validation SHALL use frozen point-in-time benchmarks and control look-ahead, survivorship, delistings, corporate actions/distributions, transaction costs, slippage, horizons, and market regimes; results SHALL be reported by asset type and horizon. |
| `PRD-NFR-019` | `CAP-TGT-001` | Approved | Before isolated external evaluation, access to the deployment SHALL require individually accountable authentication and least-privilege authorization; shared public access SHALL remain disabled. |
| `PRD-NFR-020` | `CAP-TGT-001` | Approved | Isolated external evaluation SHALL encrypt personal portfolio/decision data in transit and at rest, keep provider credentials server-side in managed secrets, and log administrative access without exposing secrets. |
| `PRD-NFR-021` | `CAP-TGT-002` | Approved | Before external evaluation, portfolio and retained decision data SHALL have tested encrypted backups and restore procedures with a proposed RPO of four hours and RTO of 24 hours, subject to OQ-8 approval. |
| `PRD-NFR-022` | `CAP-TGT-001` | Approved | External evaluation SHALL have a named incident owner, documented incident triage and notification/escalation path, and a rehearsed rollback that preserves retained ledger and decision history. |
| `PRD-NFR-023` | `CAP-TGT-001` | Approved | Before external evaluation, dependency/vulnerability scanning, access-control tests, secret-leak checks, and restore/incident exercises SHALL pass; failures block invitations. |

## 11. Testing Strategy

### 11.1 Financial Correctness

- Validate every financial and portfolio metric against independently
  calculated, versioned fixtures with documented formula, units, periods, and
  rounding.
- Cover PEG forward/trailing distinctions, period alignment, negative and
  near-zero EPS/growth, extreme growth, estimate revisions, dispersion,
  missing data, and `Not Meaningful` outcomes.
- Contract fixtures SHALL show Target-Horizon PEG and trailing/provider PEG
  together, separately labeled, and verify that stale or conflicting provider
  PEG cannot enter authoritative scoring.
- Evidence Strength fixtures SHALL mutate optional-field weights and prove
  that adding low-weight fields cannot compensate for absent material fields.
- Use point-in-time, provider-independent fixtures covering missing fields,
  stale observations, provider conflicts, restatements, and corporate actions.
- Control look-ahead, survivorship, delistings, distributions, transaction
  costs, slippage, benchmark choice, horizons, and market regimes.
- Freeze benchmark identity, mapping-policy version, rights state, and
  selection/observation times before outcome data is revealed; attempted
  post-outcome remapping SHALL fail.
- Portfolio Fit fixtures SHALL exercise concentration, correlation, sector/
  factor overlap, liquidity, drawdown, and hard-cap boundary interactions.
- Use walk-forward and out-of-sample validation and report results by asset
  type, horizon, and market regime.
- Investment-outcome claims SHALL remain disabled until their declared
  horizons mature. Short interaction history MAY inform explicit preference
  learning but SHALL NOT be presented as return-prediction evidence.

### 11.2 Runtime Test Responsibilities

- **Backend:** domain policies, snapshot replay, controller contracts,
  degradation, ledger persistence, CSV idempotency, labels, legal gates, and
  personalization transitions.
- **Data-service:** provider normalization, stock/ETF separation, boundary
  cases, deterministic analytics, and DataFrame equality with
  `pandas.testing.assert_frame_equal`.
- **Frontend:** provenance and status rendering, Decision Card suppression,
  LLM-independent results, policy disclosures, and personal-model fallback.
- **Cross-runtime:** versioned fixtures verify Spring DTOs, FastAPI schemas, and
  TypeScript types.
- **Privacy:** consent, export, reset, deletion propagation, cache eviction,
  backup expiry, legal-hold isolation, and separation of personal data from
  shared evidence.
- **External release:** versioned legal/disclosure and data-rights records,
  wrong jurisdiction, expired/revoked approval, unapproved output/profile
  schema, missing delay labels, access control, encrypted backup/restore,
  vulnerability checks, and incident rollback.

### 11.3 Provider and Failure Testing

- Tests never call live external financial providers.
- Providers use stubs or wire-level mocks for valid, partial, empty, stale,
  conflicted, rate-limited, and failed responses.
- LLM timeout, refusal, malformed output, and outage must leave Decision Result
  unchanged.
- Kill-switch tests prove that alerts, AI, personalization, or one provider can
  be disabled without history loss or deterministic-core failure.

### 11.4 Release Evidence

Each promoted requirement requires passing automated tests, applicable smoke
scenarios, and an E3 record containing the exact command, result, execution
date, environment, and evidence locator.

## 12. Delivery Phases (Post-V1)

### 12.1 Personal Investment Policy Learning — `CAP-TGT-008`

Post-V1 personalization progresses through event instrumentation, offline
training, shadow comparison, limited ranking/threshold activation, and only
then controlled decision influence. It remains single-user, consented, and
bounded by the requirements in Section 9.8.

### 12.2 Read-Only Broker Reconciliation — `CAP-TGT-009`

Broker connectivity is read-only and reconciles staged external records with
the authoritative transaction ledger. It does not add execution or broker
write-back.

### 12.3 SaaS Identity and Operations — `CAP-TGT-010`

Shared or paid operation requires authenticated ownership, tenant isolation,
subscriptions, entitlements, support, operational controls, privacy validation,
and migration from isolated evaluation deployments.

### 12.4 Explicit Post-V1 Exclusions

Post-V1 phases do not implicitly authorize trade execution, automatic
rebalancing, psychological inference, cross-user behavioral learning,
user-specific general-purpose LLM fine-tuning, real-time signals, or new asset
classes. Each requires a separately approved PRD change.

## 13. References

### 13.1 Internal Sources

- `docs/superpowers/specs/2026-09-29-investment-platform-product-foundation-design.md`
- `docs/superpowers/plans/2026-09-29-product-documentation-reconstruction.md`
- `AGENTS.md`
- `SPEC.md`

### 13.2 External Primary Sources

- [SEC — Robo-Advisers: IM Guidance Update 2017-02](https://www.sec.gov/investment/im-guidance-2017-02.pdf)
- [SEC — Staff Bulletin: Standards of Conduct and Care Obligations](https://www.sec.gov/about/divisions-offices/division-trading-markets/broker-dealers/staff-bulletin-standards-conduct-broker-dealers-investment-advisers-care-obligations)
- [SEC — General Information on Regulation of Investment Advisers](https://www.sec.gov/files/divisions/investment/iaregulation/memoia.htm)
- [FINRA Rule 2111 — Suitability](https://www.finra.org/rules-guidance/rulebooks/finra-rules/2111)
- [Nasdaq — U.S. Equities and Options Data Policies](https://www.nasdaqtrader.com/content/AdministrationSupport/Policy/USEquitiesandOptionsDataPolicies.pdf)
- [NYSE — Market Data and Connectivity Documents](https://www.nyse.com/connectivity/documents)
