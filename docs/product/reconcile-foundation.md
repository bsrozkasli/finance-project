# Foundation-to-PRD Reconciliation Review

**Review status:** Revision required
**Review type:** Product-input reconciliation
**Source of approved decisions:**
`docs/superpowers/specs/2026-09-29-investment-platform-product-foundation-design.md`
**Artifact reviewed:** `docs/product/PRD.md`
**Date:** 2026-09-29

## 1. Verdict

The PRD is directionally faithful to the approved foundation. It preserves the
core vision, target user, supported investment universe, deterministic-evidence
posture, connected workflow, Value-MVP phases, major deferred scope, legal and
data-rights gates, and the principle that AI explanation cannot change the
authoritative result.

It is not yet source-equivalent. Several approved safety and decision semantics
are absent, the activation and personalization metrics have changed meaning,
and several material scope decisions have been introduced without being marked
as assumptions or newly approved requirements. These differences should be
resolved before the PRD becomes the canonical source for gap mapping and epic
ownership.

## 2. Findings

### RF-01 — Activated Discovery is materially weakened

**Type:** Distorted approved decision
**Severity:** Blocker
**Areas:** Journey, activation, success metrics

The foundation defines `Activated Discovery` as completing the screener,
shortlist, research, and portfolio-fit review for at least one candidate within
seven days. PRD Section 4 instead defines it as a single session in which the
user runs a screen, inspects an explanation, and saves or rejects a candidate.
Research and Portfolio Fit are no longer required.

This changes the product's primary activation claim from proof of the connected
decision workflow to proof of shallow screener engagement. `SM-2` therefore no
longer measures the approved Value-MVP promise.

**Required reconciliation:** Restore the foundation definition and use it
consistently in the glossary, `SM-2`, instrumentation, and acceptance evidence.
If a lighter screener event is useful, give it a separate name and do not use it
as the Value-MVP activation KPI.

### RF-02 — Success-metric definitions and denominators have drifted

**Type:** Missing and distorted approved decisions
**Severity:** High
**Areas:** Success metrics, launch gates

The PRD omits the foundation's definitions of `Activated user` and `Meaningful
research result`, even though both terms are used by normative metrics. In the
foundation, a meaningful result includes either a Decision Result with at least
`Medium` Evidence Strength or a fully explained `Watch - Insufficient Evidence`
result. Omitting the latter risks rewarding suppression or hiding valuable
failure explanations.

Additional metric drift includes:

- The foundation sets the time-to-result target at under ten minutes; `SM-1`
  adds an unapproved `80% of evaluated users` threshold.
- The foundation measures first-session candidate saving among activated users;
  `SM-3` changes the denominator to all users and the timing to a "first
  qualified discovery session."
- The foundation defines weekly retention as research, portfolio review, or
  alert review in the next seven-day window; the PRD uses the broader and less
  testable term "research or monitoring action."
- The foundation's personalization KPI is the share of shortlisted candidates
  reaching a completed research and Portfolio-Fit decision. `SM-8` generalizes
  this to "workflow completion," changing what uplift means.

**Required reconciliation:** Reinstate the approved definitions, denominators,
events, and time windows. Mark any newly proposed threshold as an assumption
requiring product-owner approval rather than silently changing the source.

### RF-03 — Decision-label semantics and bounded transitions are missing

**Type:** Missing approved safety decisions
**Severity:** Blocker
**Areas:** Decision Card, personalization, suitability

The PRD preserves the label vocabulary but not the foundation's semantics:

- `Add` may apply to owned or unowned assets.
- `Hold` and `Reduce` apply only to owned assets.
- `Avoid` applies only to unowned assets.
- `Watch` may apply to either and is non-directional.

The PRD also omits the exact one-step personalization transitions approved in
the foundation and the prohibitions on `Avoid -> Add`, `Reduce -> Add`, and any
change to `Watch - Insufficient Evidence`.

Generic language about bounded calibration does not preserve these behavioral
contracts. Different epics could implement incompatible labels or allow a
learned model to influence a decision more strongly than approved.

**Required reconciliation:** Add normative label applicability and the complete
transition matrix, including the minimum `Medium` Evidence Strength condition,
hard-limit checks, deterministic backend ownership, and weight-cap rules.

### RF-04 — The approved benchmark policy has been reduced to a generic rule

**Type:** Missing approved product decision
**Severity:** High
**Areas:** Research, outcome evaluation, replay

`PRD-FR-019` requires only an asset-appropriate, versioned benchmark. The
foundation additionally fixes the initial policy:

- U.S. common stocks use the S&P 500 total-return index as primary benchmark and
  a mapped GICS sector total-return benchmark as secondary.
- ETFs use their declared tracked index, with a predeclared category substitute
  only when rights prevent use of that index.
- ETF substitution reduces Evidence Strength.
- Unresolved sector or category mapping blocks benchmark-relative calibration.

**Required reconciliation:** Preserve these rules as the approved initial
benchmark policy or explicitly reopen them as a phase-blocking product decision.

### RF-05 — The PEG policy is incomplete and one formula phrase is ambiguous

**Type:** Missing and potentially distorted approved decision
**Severity:** High
**Areas:** Stock research, valuation

The PRD captures the major numerical gates but omits approved interpretation
constraints: peer comparison must account for sector, business model, and
company life cycle; estimate revisions, dispersion, and freshness accompany
interpretation; and ROIC, free-cash-flow growth/conversion, margin durability,
leverage, dilution, and earnings quality act as quality gates.

`PRD-FR-020` describes "target-date price-to-earnings." The foundation formula
uses `Price / Consensus EPS at target date`; the PRD wording could be read as a
future target price rather than the snapshot price divided by target-period
consensus EPS.

**Required reconciliation:** Preserve the peer and quality context and rewrite
the formula with unambiguous input timestamps and units.

### RF-06 — Personalization data-quality and feedback-loop controls are missing

**Type:** Missing approved safety decisions
**Severity:** High
**Areas:** Consent, learning, deletion, personalization

The PRD retains consent, minimum-history, shadow-mode, fallback, and deletion
themes but omits several approved controls:

- Passive views and clicks are diagnostic only, not positive preference labels.
- Every displayed alternative, including rejected alternatives, is retained for
  training-set construction.
- Model-generated rankings cannot become training labels without explicit user
  confirmation.
- Cross-user behavioral training and feature transfer remain disabled until a
  later approved specification.
- Deletion removes the approved list of derived records and replay keys; replay
  ends for deleted results while retained results remain reproducible.
- Legal-hold records are minimized, access-restricted, excluded from serving and
  training, disclosed, and deleted when the retention duty ends.

**Required reconciliation:** Promote these from acceptance-detail implications
to normative requirements because they define the approved learning boundary
and privacy behavior.

### RF-07 — High-priority alert scope is no longer bounded

**Type:** Missing approved scope boundary
**Severity:** High
**Areas:** Monitoring, alert quality, operational cost

`PRD-FR-041` refers to "approved material event classes" but does not name them.
The foundation limits high-priority alerts to earnings or regulatory filings,
deterministic portfolio-limit breaches, provider-confirmed corporate events,
and critical evidence-staleness events.

Without the list, ordinary news, model changes, price movement, or other noisy
events can enter the MVP while still satisfying the PRD wording.

**Required reconciliation:** Enumerate the approved classes and treat additions
as post-MVP scope or a separately approved change.

### RF-08 — Multi-portfolio and cash-accounting scope has been introduced

**Type:** Over-specified product scope
**Severity:** High
**Areas:** Persona, onboarding, ledger, Portfolio Fit

The PRD persona manages "one or more" portfolios, and the glossary and
acceptance evidence make cash a required component of Portfolio State. The
foundation defines a personal single-user deployment, a portfolio created from
manual/CSV transactions, and ledger-derived holdings, cost basis, realized
activity, and exposure. It does not approve multi-portfolio behavior or cash
accounting semantics.

Both additions affect identifiers, ledger rules, transfers, allocation,
Portfolio Fit, CSV schemas, and acceptance testing.

**Required reconciliation:** Either narrow the Value MVP to one portfolio and
the approved ledger outputs, or mark multi-portfolio and cash accounting as
explicit assumptions requiring approval and separate requirements.

### RF-09 — Screener explanation requirements expand cost and behavior

**Type:** Over-specified journey and scope
**Severity:** Medium
**Areas:** Discovery, performance, cost

The foundation requires each screening result to explain why an asset matched.
The PRD requires rule-level explanations for inclusion, exclusion, or
insufficient status for every result and adds a recorded reason when a user
rejects a candidate. It also describes specific quality, growth, valuation,
risk, and exposure filters as user-selectable behavior.

Explaining every excluded member of the point-in-time universe is materially
broader and potentially more expensive than explaining returned matches. A
mandatory rejection rationale also adds interaction friction not approved in
the foundation.

**Required reconciliation:** Limit the MVP contract to explainable returned
results and optional user annotations, or explicitly approve the broader
exclusion-explanation and rejection-capture scope with cost/performance gates.

### RF-10 — New compliance, accessibility, and disclosure obligations are
presented as approved requirements

**Type:** Over-specified governance and quality scope
**Severity:** Medium
**Areas:** Compliance, accessibility, release readiness

The PRD adds WCAG 2.1 AA, keyboard/focus requirements, a detailed plain-language
algorithmic-disclosure duty, material-methodology notification, and an asserted
SEC/FINRA policy basis. These may be appropriate launch requirements, but they
are not approved decisions in the foundation and were not marked as proposed
additions.

**Required reconciliation:** Retain them only as clearly labeled proposed
launch-grade additions pending product, UX, and qualified-counsel approval, or
record the approval source. Do not present external guidance as a legal
classification.

### RF-11 — Long term is newly declared the primary product horizon

**Type:** Over-specified qualitative intent
**Severity:** Medium
**Areas:** Positioning, research prioritization

The foundation requires separate `3-<18 month` and `18-32 month` outlooks and
limits tactical context to timing and risk. The PRD additionally calls
`18-32 months` the primary product horizon. This affects default UX, metric
weighting, scenario emphasis, and launch messaging but is not stated in the
approved foundation.

**Required reconciliation:** Mark the priority as an explicit product
assumption for approval or remove "primary" while preserving separate outlooks.

### RF-12 — The PRD relies on an unaudited current-contract claim

**Type:** Over-specified current-state assumption
**Severity:** Medium
**Areas:** Contract migration, documentation integrity

`PRD-NFR-015` and `OQ-5` refer to current `BUY/HOLD/SELL` and confidence fields.
The reconstruction plan requires current behavior to be established through the
baseline and treats pre-baseline claims as unverified. The foundation records a
preliminary E2 PEG observation but does not approve this API claim as target
input.

**Required reconciliation:** Express the migration rule generically until the
current-state audit supplies a `CAP-CUR-*` locator, then link the verified
contract through the gap map.

## 3. Faithful Areas Requiring No Product Reconciliation

The following areas are materially aligned with the approved foundation:

- Evidence-driven vision and advanced self-directed retail-investor persona.
- Connected Discover-to-Monitor workflow and separation of Investment Quality
  from Portfolio Fit.
- Restricted U.S. common-stock and eligible equity-ETF universe.
- Manual/CSV onboarding, immutable evidence, no fabricated fallback data, and
  graceful provider/LLM degradation.
- Deterministic `DecisionResult` separated from optional AI
  `NarrativeAttachment`.
- Value-MVP phase ordering, deferred broker/SaaS scope, isolated evaluation
  deployments, and no paid release before SaaS/commercial gates.
- Prohibition of predictive confidence and `Buy/Hold/Sell` in the new target
  contract.
- Data-rights, legal-review, feature-flag, variable-cost-budget, and release
  blocker posture.
- Core alert-quality targets, evidence-coverage targets, no-fabrication and
  no-policy-harm counter-metrics.

## 4. Reconciliation Order

Resolve `RF-01` through `RF-03` before using the PRD for capability-gap or epic
generation because they change the activation claim and authoritative decision
behavior. Resolve `RF-04` through `RF-07` before writing research,
personalization, and monitoring stories. Obtain explicit approval or remove the
scope additions in `RF-08` through `RF-12` before assigning delivery ownership.
