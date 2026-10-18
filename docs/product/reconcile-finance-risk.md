# Finance and Risk Reconciliation Review

**Reviewed artifact:** `docs/product/PRD.md`
**Approved source:** `docs/superpowers/specs/2026-09-29-investment-platform-product-foundation-design.md`
**Review date:** 2026-09-29
**Scope:** Financial methodology, PEG, evidence quality, decision semantics,
Portfolio Fit, personalization, legal/suitability gates, data rights, and metric
safety. This is a read-only reconciliation report; it does not amend the PRD.

## Verdict

**NEEDS REVISION before capability-gap and epic decomposition.**

The PRD preserves most of the approved foundation: evidence-first processing,
separate stock and ETF models, deterministic analytics, Investment Quality
separated from Portfolio Fit, fail-closed evidence handling, the MVP decision
vocabulary, bounded personalization, and provider-rights/legal release gates.
However, seven material requirements were weakened, generalized, or assigned
to the wrong phase. Two are release blockers: the regulatory gate does not
unambiguously cover Phase-1 policy-conditioned labels and weights, and the PRD
omits the approved deterministic label/transition semantics.

## Findings

### FIN-01 — BLOCKER: the personalized-output legal gate is assigned too narrowly

**Approved foundation**

Section 4.1 requires qualified-counsel approval before any external or
commercial release of personalized suitability signals, action labels, or
maximum suggested weights. Until approval, external builds show objective
research and `Policy Fit` only.

**PRD state**

- `PRD-FR-026` makes explicit User Policy a Phase-1 dependency and permits
  portfolio-aware labels and weights.
- `PRD-NFR-009` assigns the counsel gate to `CAP-TGT-008`, which is Phase 3
  learned personalization and is marked `Approved after gates`.
- Section 8 and the risk table state the broader intended gate, but no Phase-1
  requirement makes it mechanically enforceable.

**Risk**

An implementation team could reasonably ship Phase-1 action labels or weights
conditioned on the user's risk profile while treating the legal gate as a
Phase-3 concern. Explicit-policy personalization may still be personalized
securities advice; the absence of learned behavior does not settle product
classification.

**Required reconciliation**

The counsel gate must be owned by `CAP-TGT-004` or a cross-cutting release
capability and must explicitly cover every user-policy-conditioned label or
weight, whether produced with or without a learned model. Before approval, the
external contract/UI must expose only the counsel-approved objective research
and Policy Fit shape.

**Minimum acceptance evidence**

- External-release tests prove action labels and suggested weights are absent
  or suppressed without a valid jurisdiction-specific approval record.
- The gate applies equally when `personalModelArtifactId` is `none`.
- Disclosure/version records identify the approved jurisdiction, profile
  inputs, output types, retention rules, and operating controls.

### FIN-02 — BLOCKER: approved decision-label and transition semantics are missing

**Approved foundation**

Section 11.1 defines asset-ownership eligibility and meaning for every label:
`Add` may apply to owned or unowned assets; `Hold` and `Reduce` require an owned
asset; `Avoid` requires an unowned asset; and `Watch` is non-directional.
Section 11.2 defines the only permitted one-step personalization transitions
and prohibits changes to `Watch - Insufficient Evidence`.

**PRD state**

`PRD-FR-028` names the five labels but does not define their ownership
preconditions or financial meaning. `PRD-FR-045` and `PRD-FR-047` require a
bounded learner and backend authority but omit the approved transition matrix.

**Risk**

Different stories can make `Hold` mean neutral research for an unowned asset,
allow `Avoid` on an existing position, or let personalization make an
unapproved transition. That destroys comparability, replay meaning, and the
legal/disclosure interpretation of a Decision Result.

**Required reconciliation**

Promote the foundation's exact label semantics and one-step transition matrix
into normative PRD requirements. State explicitly that the learned model emits
only a versioned proposal and that backend deterministic policy owns the final
transition.

**Minimum acceptance evidence**

A decision table must cover owned/unowned state, base label, proposed
adjustment, Evidence Strength, hard-limit status, final label, and suppression.
Property tests must reject every transition not explicitly allowed.

### FIN-03 — HIGH: the benchmark policy was reduced to “asset appropriate”

**Approved foundation**

Section 9.3 fixes the stock primary benchmark to the S&P 500 total-return index
and the secondary benchmark to the mapped GICS sector total-return benchmark.
An ETF uses its declared tracked index, with a predeclared category substitute
only when rights prevent use; substitution lowers Evidence Strength. Unresolved
sector/category mapping blocks benchmark-relative calibration.

**PRD state**

`PRD-FR-019` requires a versioned, frozen, asset-appropriate benchmark, but
omits the approved hierarchy, substitution consequence, secondary stock
benchmark, and unresolved-mapping behavior.

**Risk**

Benchmark selection can vary across teams or be optimized after observing
results. ETF tracking evaluation and stock sector-relative evaluation can
silently use different standards. Index licensing can also be bypassed without
an explicit degraded state.

**Required reconciliation**

Restore the approved stock and ETF mapping rules, including total-return basis,
secondary stock benchmark, substitution metadata, Evidence Strength effect,
and fail-closed calibration behavior. The provider-rights register must cover
benchmark display, derived use, retention, and external redistribution.

### FIN-04 — HIGH: Target-Horizon PEG remains financially ambiguous in the PRD

**Approved foundation**

Section 10 defines Target-Horizon PEG as snapshot price divided by consensus
EPS at the target fiscal date, then divided by exact fractional-period EPS CAGR
in percentage points. It requires retained inputs, units, formula version,
analyst count and estimate dispersion. Dispersion is compared with 50% of the
absolute consensus mean. ROIC, FCF growth/conversion, margin durability,
leverage, dilution, and earnings quality are explicit quality gates.

**PRD state**

- `PRD-FR-020` says “target-date price-to-earnings,” which can be read as a
  target-price P/E rather than snapshot price over target-date EPS.
- `PRD-FR-022` uses “estimate dispersion exceeds 50%” without defining its
  denominator.
- The PEG requirements do not require retention of all calculation inputs,
  units, estimate count, dispersion, and formula version.
- `PRD-FR-023` refers generically to quality/risk gates rather than preserving
  the approved quality-gate set.
- OQ-4 leaves normalized EPS and peer/lifecycle policy unresolved even though
  the PEG requirements are marked `Approved`.

**Risk**

Implementations can produce materially different PEG values from identical
evidence while all claiming PRD compliance. The current implementation already
uses a raw provider PEG, universal thresholds, and equal ratio weights, so an
exact migration target is essential.

**Required reconciliation**

Define the numerator as snapshot price divided by consensus target-date EPS,
define dispersion as a percentage of the absolute consensus mean, require the
full calculation record, and name the approved quality gates. PEG scoring must
remain blocked until normalized-EPS and peer/lifecycle policies are approved.

### FIN-05 — HIGH: critical-conflict handling is not explicit in Evidence Strength

**Approved foundation**

Section 7.1 makes Evidence Strength `Insufficient` when any mandatory field is
missing or stale, instrument type is unresolved, or a critical source conflict
remains unresolved. `High` and `Medium` also require no unresolved critical
conflict.

**PRD state**

`PRD-FR-008` carries the coverage percentages and mandatory-field rule, but it
does not explicitly map an unresolved critical conflict or unresolved
instrument type to `Insufficient`. OQ-3 leaves conflict rules, mandatory fields,
and freshness windows open.

**Risk**

A system can satisfy the literal acceptance text while scoring high-coverage
but mutually contradictory evidence as `Medium` or `Low`, then produce a
directional decision.

**Required reconciliation**

Add the exact critical-conflict and unresolved-instrument rules to
`PRD-FR-008`. Make approval of per-asset mandatory fields, freshness windows,
conflict severity, and source precedence an entry gate for Phase-1 decision
stories.

### FIN-06 — HIGH: personalization feedback-loop controls were omitted

**Approved foundation**

Section 12 requires explicit pairwise preferences, records every displayed and
rejected alternative, prohibits passive views/clicks as positive labels,
prohibits model-generated rankings from becoming labels without user
confirmation, and disables cross-user training/behavioral transfer absent a
later approved specification.

**PRD state**

The numeric activation gates and hard-limit boundaries are preserved, but
`PRD-FR-044` through `PRD-FR-049` omit these label-provenance and feedback-loop
rules.

**Risk**

The learner can reinforce its own rankings, interpret exposure as preference,
or train only on accepted candidates. That can amplify familiarity, recency,
and disposition biases while still passing the stated history and shadow-mode
thresholds.

**Required reconciliation**

Add normative requirements for explicit label provenance, rejected-alternative
retention, non-use of passive behavior as positive preference, prevention of
self-generated labels, and prohibition of cross-user learning in the approved
single-user scope.

### FIN-07 — HIGH: metric-correctness acceptance is incomplete across the product

**Approved foundation**

Section 17 requires every financial metric to be tested against independently
calculated, versioned fixtures with documented formula, units, periods, and
rounding. Point-in-time tests include missing fields, stale data, provider
conflicts, restatements, and corporate actions. Outcome validation includes
look-ahead, survivorship, delistings, distributions, transaction costs,
slippage, benchmarks, horizons, and market regimes.

**PRD state**

`PRD-FR-017` requires metric fixtures for stock evaluation and
`PRD-NFR-014` covers outcome-bias controls, but no cross-cutting requirement
applies independent formula/unit/period/rounding fixtures to ETF metrics,
Portfolio Fit, Investment Quality, weight caps, and decision-policy
calculations. Restatement and provider-conflict fixtures are not explicitly
required by NFR-014.

**Risk**

The system can pass outcome-oriented validation while individual authoritative
metrics differ by runtime, unit convention, rounding, or revised source data.
This is especially material for percentage-versus-decimal ratios, total-return
benchmarks, ETF tracking error, covariance/risk calculations, and weight caps.

**Required reconciliation**

Add one cross-cutting metric-safety requirement covering every authoritative
financial and portfolio calculation. Require independent expected values and
point-in-time fixtures for restatements, conflicts, corporate actions, missing
data, and boundary units.

## Confirmed Alignment

No reconciliation issue was found in these areas:

- The supported stock/ETF universe and instrument exclusions match the
  foundation.
- Tactical, medium, and long horizons match and remain separate.
- Investment Quality is portfolio-independent and Portfolio Fit is explicitly
  marginal to a versioned Portfolio State.
- The PRD correctly prohibits neutral/fair substitution for missing evidence,
  separates Narrative Attachment from Decision Result, and preserves the
  deterministic core through LLM/provider failure.
- The PEG eligibility count, 2% lower growth boundary, 50% upper growth rule,
  ten-peer minimum, ETF exclusion, and no-universal-PEG rule are preserved.
- Personalization's 20-decision/eight-week, four-week shadow, and
  30-matured-decision/three-month gates are preserved, as are consent,
  deletion, fallback, and no-cap-increase requirements.
- Provider-by-provider rights coverage, delay labeling, and the rule that API
  availability is not permission are correctly stated.
- Public API migration is explicitly gated; current `BUY/HOLD/SELL` and
  confidence fields may not be silently reinterpreted.

## Official-Source Cross-Check

These sources do not determine applicability to this product; qualified counsel
must do that. They establish constraints that materially justify PRD gates.

- SEC robo-adviser staff guidance emphasizes understandable disclosure of an
  algorithm's functions, assumptions, limitations, business scope, risks, and
  use of client information. PRD Section 8 is aligned, subject to FIN-01.
  [SEC IM Guidance Update 2017-02](https://www.sec.gov/investment/im-guidance-2017-02.pdf)
- SEC staff materials state that regulated advice should not rely on materially
  inaccurate or incomplete investment information and that sufficient investor
  information is needed before personalized advice. The PRD's suppression rule
  is aligned, but the five-field minimum profile remains subject to counsel and
  OQ-1/OQ-4.
  [SEC Standards of Conduct and Care Obligations](https://www.sec.gov/about/divisions-offices/division-trading-markets/broker-dealers/staff-bulletin-standards-conduct-broker-dealers-investment-advisers-care-obligations)
- SEC materials describe adviser status using a fact-specific analysis of
  compensation, being in the business, and securities advice. Product wording
  alone does not resolve classification. FIN-01 therefore remains a release
  blocker.
  [SEC Regulation of Investment Advisers](https://www.sec.gov/files/divisions/investment/iaregulation/memoia.htm)
- FINRA Rule 2111, where applicable to a FINRA member or associated person,
  treats customer profile sufficiency, risk/reward understanding, and even an
  explicit hold recommendation as material suitability concerns. The PRD
  correctly avoids claiming automatic applicability but must preserve precise
  label meaning.
  [FINRA Rule 2111](https://www.finra.org/rules-guidance/rulebooks/finra-rules/2111)
- Nasdaq policy shows that externally distributed derived price data can be
  fee-liable and that delayed-data displays can require prominent delay labels.
  NYSE requires relevant agreements for market-data receipt/use/redistribution.
  `PRD-NFR-008` and Section 8 are aligned.
  [Nasdaq U.S. Equities and Options Data Policies](https://www.nasdaqtrader.com/content/AdministrationSupport/Policy/USEquitiesandOptionsDataPolicies.pdf),
  [NYSE Market Data Documents](https://www.nyse.com/connectivity/documents)

## Reconciliation Gate

The PRD should not advance to financial decision, personalization, or external
release epics until FIN-01 and FIN-02 are resolved. FIN-03 through FIN-07 may be
resolved in the PRD or explicitly converted into phase-entry requirements with
owners and acceptance evidence; they must not remain implicit implementation
choices.
