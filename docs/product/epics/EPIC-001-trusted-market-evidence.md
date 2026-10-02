# EPIC-001 - Trusted Market Evidence

- Phase: V1 Foundation, first trusted-core outcome.
- Delivery state: Target catalog only; gap-map gates remain in force.

## Outcome

An investor can see whether each U.S. stock or eligible equity ETF fact is
usable, where and when it came from, and why an evaluation is limited. The
`CAP-TGT-001` evidence contract is source-, time-, quality-, and rights-traceable
without inventing missing data.

## Problem

Current asset, price, and research routes expose mixed provider boundaries and
empty/nullable/error degradation. A route or cached value alone cannot prove
instrument eligibility, freshness, rights, or suitability for a decision.

## Scope

- Resolve point-in-time NYSE/Nasdaq common-stock and eligible U.S. equity-ETF
  identity through a licensed security master; fail closed on unresolved type.
- Assemble immutable, versioned Research Evidence Snapshots with field-level
  provenance, observation/retrieval times, period, currency, normalization,
  missingness, conflicts, and status.
- Apply separate approved stock/ETF mandatory fields, weighted optional
  coverage, freshness windows, and conflict priorities to deterministic
  Evidence Strength.
- Preserve valid sections during provider failure; expose section status and
  explicit insufficient evidence without zero-fill or synthetic values.
- Bind external dataset use to versioned `DataRightsApproval`; add bounded
  provider/evidence telemetry and isolated-evaluation security, access,
  incident, and rollback gates.

## Out of Scope

Portfolio accounting, stock/ETF investment scores, PEG, decision labels,
discovery ranking, AI narrative, broker execution, and shared SaaS identity.
External display is not authorized by API availability or this epic alone.

## Requirements

Each row is the sole primary delivery assignment from the
[gap map](../CAPABILITY_GAP_MAP.md), not a claim that the target is implemented.

| Requirement | Delivery boundary |
|---|---|
| `PRD-FR-001` | Point-in-time U.S. common-stock universe. |
| `PRD-FR-002` | Fail-closed eligible equity-ETF universe. |
| `PRD-FR-003` | Licensed security-master identity and classification. |
| `PRD-FR-004` | Distinct tactical, medium, and long horizon identifiers. |
| `PRD-FR-005` | Immutable snapshot per retained evaluation. |
| `PRD-FR-006` | Decision-critical field provenance and quality metadata. |
| `PRD-FR-007` | Explicit missing, stale, conflicted, and unavailable evidence. |
| `PRD-FR-008` | Versioned asset-specific Evidence Strength policy. |
| `PRD-FR-009` | Seven provider-backed section statuses. |
| `PRD-FR-010` | Partial failure without fabricated values. |
| `PRD-FR-072` | Versioned rights approval bound to external output. |
| `PRD-NFR-001` | Source/freshness coverage for displayed and critical fields. |
| `PRD-NFR-002` | Snapshot immutability and revisions. |
| `PRD-NFR-005` | Deterministic core survives provider, LLM, or model failure. |
| `PRD-NFR-008` | Rights-compatible external use. |
| `PRD-NFR-016` | Privacy-safe provider/evidence/cost telemetry. |
| `PRD-NFR-019` | Individually accountable isolated-evaluation access. |
| `PRD-NFR-020` | Encryption, server-side secrets, and access audit. |
| `PRD-NFR-022` | Named incident owner and history-preserving rollback. |
| `PRD-NFR-023` | Pre-invitation security and recovery checks. |

## Dependencies

- [EPIC-000](EPIC-000-current-state-verification.md) and the
  [current-state baseline](../CURRENT_STATE_BASELINE.md) identify the bounded
  current contracts and known provider/degradation conflicts.
- OQ-2 must approve each security-master/provider use and delay label; OQ-3
  must approve stock/ETF evidence policy and independent boundary fixtures.
- OQ-5 governs any changed public route or DTO. OQ-7/8 govern measurement and
  external cohort/security gates; OQ-1 governs regulated output classification.
- EPIC-002 through EPIC-004 consume the versioned snapshot and instrument
  identity. They must not duplicate this epic's primary requirement ownership.

## Risks

- The current resolver and direct-provider analytics coexist; an apparently
  populated result may lack uniform fallback or freshness semantics.
- Rights for display, caching, derived analytics, backtests, model use, and
  redistribution can differ by dataset and deployment.
- A critical conflict, unresolved type, or stale mandatory field must produce
  `Insufficient`, not a downgraded but directional result.
- Disposition: Retain `DOC-CONFLICT-001`, `DOC-CONFLICT-006`,
  `DOC-CONFLICT-008`, and `DOC-CONFLICT-010` in the
  [conflict ledger](../evidence/legacy-document-conflicts.md); this epic does
  not silently resolve their current-state claims.

## Success Evidence

- Independent point-in-time fixtures reject unsupported stocks/ETFs and
  unresolved identity; rights fixtures reject expired, revoked, or
  use-incompatible approvals before external rendering.
- Snapshot persistence/replay fixtures prove field provenance, immutable
  revisions, weighted Evidence Strength thresholds, and seven section states.
- Stubbed provider-chain contract tests show valid sections survive partial,
  empty, stale, rate-limited, and failed sources without synthetic values.
- Before invitations, approved OQ-2/3/5/7/8 artifacts and access, secret,
  vulnerability, backup/restore, and incident exercises provide exact command,
  result, date, environment, and locator evidence. No current audit test alone
  satisfies these future acceptance gates.

## Story Plan

Proposed IDs are planning placeholders, not implementation-ready stories.
Detailed files wait for the named policy/right/contract approvals and a
separate EPIC-001 story plan.

| Proposed story | Outcome | Dependency |
|---|---|---|
| `STORY-001-01` | Classify eligible instruments from a licensed point-in-time master. | EPIC-000 and OQ-2 |
| `STORY-001-02` | Retain immutable evidence with complete field provenance. | STORY-001-01 and OQ-3 |
| `STORY-001-03` | Expose asset-specific Evidence Strength and section states. | STORY-001-02 and OQ-3 |
| `STORY-001-04` | Preserve partial provider results and bind external data rights. | STORY-001-02 and OQ-2 |
| `STORY-001-05` | Gate isolated evaluation with telemetry, security, and incident proof. | STORY-001-03 and OQ-8 |
