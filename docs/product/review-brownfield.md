# Brownfield PRD Review

**Artifact reviewed:** `docs/product/PRD.md`
**Review lens:** Brownfield product and technical direction
**Review date:** 2026-09-30
**Verdict:** **Conditionally sound as a target-product draft; blocked for final epic/story decomposition.**

The PRD has a strong target/current boundary, preserves the principal repository
architecture and API constraints, separates V1 from post-V1 scope, and follows
the requested section order. Its decision not to create a separate Product
Brief is justified for this project because the approved product-foundation
design already performs the upstream brief function. The remaining blockers are
delivery-readiness and traceability problems, not a missing product vision.

## Blocker

### BR-01 - The PRD is not yet safe as the sole input to epics or stories

**Evidence:** metadata marks `workflowComplete` as `false` (line 4); the PRD
states that the current system still requires an evidence audit (lines 39-44);
Phase 0 is the current-reality audit (lines 363-369); final epic decomposition
depends on a current-state baseline and capability gap map (lines 393-404); and
five phase-blocking questions remain open (lines 406-420).

This is the correct brownfield posture, but it means downstream authors cannot
yet determine whether a requirement is already implemented, partially present,
contradicted by a legacy contract, or wholly new. In particular, target
instrument classification and decision semantics intentionally differ from
current `SPEC.md` behavior. A story generated directly from the PRD could
silently replace an endpoint/DTO meaning or remove a required compatibility
path.

**Required action:** do not mark the PRD complete or generate final
`EPIC-001`-`EPIC-010` story packages until Phase 0 produces the evidence-backed
current-state baseline and the capability gap map assigns every `PRD-FR-*` and
`PRD-NFR-*` exactly one gap class, owning epic, dependency, migration treatment,
and acceptance-evidence locator. Draft epic boundaries may use the PRD, but
implementation stories must consume the PRD together with those two artifacts.

## High findings

### BR-02 - Requirement status conflates product approval with delivery readiness

Nearly every V1 requirement is marked `Approved`, while `OQ-3`, `OQ-4`, and
`OQ-5` leave mandatory evidence/freshness/conflict policy, normalized-EPS and
peer policy, Portfolio Fit and weight-cap formulas, and contract migration
unresolved. The target intent can be approved while implementation remains
blocked, but the current single status column does not express that distinction.

This is most visible around `PRD-FR-008`, `PRD-FR-019`-`023`,
`PRD-FR-025`-`029`, `PRD-FR-055`, and `PRD-NFR-015`. Downstream planning could
interpret `Approved` as story-ready even though the PRD itself says key policies
are not approved.

**Required action:** retain `Approved`/`Deferred` as the product-scope decision,
but add a separate delivery-readiness mechanism in the capability gap map (for
example `Ready`, `Blocked`, or `Deferred`). Each blocked row must reference an
open-question ID, name a decision owner, state the closure artifact, and define
the condition that allows story authoring. At minimum, assign owners and phase
entry gates for `OQ-1` through `OQ-5`.

### BR-03 - Several requirements are too compound for one-owner traceability

The reconstruction plan calls for atomic SHALL requirements, but several PRD
rows bundle independently deliverable and independently failing obligations.
Examples include:

- `PRD-FR-019`: stock benchmark, sector benchmark, ETF benchmark,
  substitution, Evidence Strength effect, and unresolved-mapping behavior.
- `PRD-FR-023`: ETF exclusion, universal-threshold prohibition, peer/lifecycle
  interpretation, displayed evidence, policy gates, and multiple quality gates.
- `PRD-FR-028`: five label definitions and their ownership preconditions.
- `PRD-FR-048`: inspection, correction, export, reset, deletion across many
  stores, backup expiry, and legal-hold behavior.
- `PRD-NFR-014`: calculation fixtures plus a separate set of outcome-validation
  controls.

A single gap-map row and owning story cannot honestly report partial completion
or acceptance for these clauses. This weakens the promised one-requirement to
one-gap-row to one-owner chain.

**Required action:** split independently testable obligations into stable IDs
before the gap map is finalized, or define named sub-requirements with their own
acceptance evidence. Preserve the existing IDs as parent requirements if stable
references have already escaped the PRD.

### BR-04 - Brownfield contract conflicts need explicit disposition, not only a generic migration rule

Section 6 and `PRD-NFR-015` correctly protect `/api/v1`, coordinated DTO
migration, the three-runtime boundary, hexagonal backend rules, provider
degradation, DB-first price loading, and no-fabrication behavior. However, the
PRD deliberately introduces target semantics that conflict with current
contracts, including fail-closed instrument classification versus the current
minimal-`STOCK` batch-add fallback, and the new Decision Result vocabulary
versus the current agent-analysis `decision`/`confidence` response.

The PRD acknowledges this class of conflict, but `OQ-5` is still only a question
and no current capability or conflict identifier is attached to the affected
requirements. This is not a reason to copy the current API inventory into the
PRD; it is a reason to make the brownfield handoff explicit.

**Required action:** after the baseline audit, attach verified current-contract
and conflict IDs to the affected capability-gap rows and require one explicit
disposition: preserve, version, coordinate all consumers, or retire after a
compatibility window. Do not let target wording itself authorize a legacy
contract change.

## Areas that pass this review

### Current versus target

The boundary in Section 1.1 is explicit and correct: the PRD defines target
behavior and does not claim implementation. Promotion to root `SPEC.md` is
gated on implementation and E3 verification. No blocker/high issue was found in
the wording of this boundary.

### Architecture and API constraints

Section 6 and `PRD-NFR-015` capture the material non-negotiables: three
runtimes, fixed ports, `/api/v1`, backend ports/adapters, data-service analytics
ownership, frontend contract alignment, immutable migrations, provider
degradation, persistence, minimum candle count, secret isolation, and
coordinated contract migration. Detailed repository rules should remain in
`AGENTS.md` rather than being duplicated into the product requirements.

### Roadmap and deferred scope

The phase model is coherent. `CAP-TGT-001`-`007` make up V1, bounded personal
policy learning is explicitly post-V1, and broker synchronization plus SaaS
identity/operations are deferred. Section 12 also prevents post-V1 headings from
silently authorizing execution, rebalancing, new asset classes, or unsafe
learning. No blocker/high scope leakage was found.

### Product Brief decision

A separate Product Brief is **not required** for this brownfield effort. The
approved foundation already contains the problem, target user, product promise,
scope, principles, release gates, and success measures that a brief would
normally establish. Creating another upstream artifact now would add another
source to reconcile. A one- or two-page brief is useful only as a derived
executive/investor communication artifact and must not become a competing
source of truth.

### Metadata and requested section order

The metadata table is at the top and the requested sections appear in the exact
order: Executive Summary, Success Criteria, Product Scope, User Journeys,
Innovation & Novel Patterns, Developer Tool Specific Requirements, Development
Roadmap & Risk, Risk Mitigation, Functional Requirements, Non-Functional
Requirements, Testing Strategy, Delivery Phases (Post-V1), and References.
`briefCount: 0`, `workflowComplete: false`, and an empty `completedAt` are
consistent with the current draft state.

Before finalization, refresh `inputDocuments` and the count fields from the
actual provenance ledger. The current table records six external sources as
`researchCount: 6` and one brainstorming input without naming that artifact;
that convention is understandable but not independently auditable. This is a
metadata cleanup, not a blocker/high product issue.

## Downstream gate

The PRD may now support product review and draft capability/epic boundaries. It
must not yet be used to generate implementation-ready stories. The gate opens
when all of the following are true:

1. Phase 0 current-state evidence and conflicts are published.
2. Every target requirement has exactly one capability-gap row and epic owner.
3. `OQ-1` through `OQ-5` have owners and explicit closure conditions; rows that
   depend on them are marked blocked until closure.
4. Compound requirements are split or given independently traceable
   sub-requirements.
5. Contract conflicts have an explicit preserve/version/migrate/retire
   disposition.
6. Product-document validation passes and `workflowComplete` can truthfully be
   set to `true` with `completedAt` populated.
