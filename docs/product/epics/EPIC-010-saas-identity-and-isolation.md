# EPIC-010 - SaaS Identity and Isolation

- Phase: Post-V1 shared SaaS; explicitly Deferred from Value MVP.
- Delivery state: `CAP-TGT-010` and all owned requirements remain Deferred.

## Outcome

An authenticated account owns each portfolio, decision, event, personal-model
artifact, cache entry, and export in a tenant-isolated shared service. Paid
activation follows approved commercial, legal, data-rights, privacy, support,
and gross-margin gates rather than merely deploying the isolated product to
multiple users.

## Problem

Current default-user routes and isolated deployments do not establish tenant
ownership, cross-user isolation, safe migration, or paid-service operations.
Adding login alone would leave cache, jobs, telemetry, support, model artifacts,
and historical replay vulnerable to cross-account exposure.

## Scope

- Establish authenticated account ownership and tenant-scoped authorization
  across storage, cache, background jobs, telemetry/logs, support tools,
  exports, and model artifacts. Backend ownership is authoritative; browser
  or data-service claims do not grant access.
- Migrate isolated records with explicit owner and consent mapping while
  preserving provenance, immutable evidence, and replay identifiers; reject
  collisions or ambiguous ownership.
- Provide subscription, pricing, entitlements, support workflows, and cost
  controls. Block paid activation until OQ-6 pricing, monthly variable-cost
  budget, and gross-margin floor are approved and verified.
- Bind external data display/model use and policy-conditioned outputs to
  rights and jurisdiction-specific legal approval. Carry personal-data
  deletion/retention, backup-hold, and export boundaries into every tenant
  store and operational workflow.

## Out of Scope

Value-MVP delivery, cross-tenant behavioral training, shared credentials,
implicit migration of unowned records, broker execution, or paid release before
commercial/legal/data-rights gates pass.

## Requirements

Each row is the sole primary assignment from the
[gap map](../CAPABILITY_GAP_MAP.md); all PRD rows are `Deferred`.

| Requirement | Delivery boundary |
|---|---|
| `PRD-FR-052` | Authenticated ownership and tenant isolation. |
| `PRD-FR-053` | Subscription, entitlement, support, and paid-cost gates. |
| `PRD-FR-054` | Ownership/consent/provenance-preserving migration. |
| `PRD-NFR-007` | Cross-user isolation in all data and operations. |

## Dependencies

- [EPIC-001](EPIC-001-trusted-market-evidence.md) rights and evidence,
  [EPIC-002](EPIC-002-transaction-ledger-portfolio-state.md) ledger ownership,
  [EPIC-004](EPIC-004-investment-quality-and-portfolio-fit.md) replay/legal
  output, and [EPIC-008](EPIC-008-personal-investment-policy.md) personal-data
  lifecycle must have explicit account mappings before shared migration.
- Post-V1 tenant architecture and threat model, OQ-1 qualified-counsel
  approval, OQ-2 dataset rights, OQ-6 paid economics, and OQ-8 security/recovery
  gates precede implementation and release. OQ-5 governs affected route/DTO
  migration for all consumers.

## Risks

- Default-user assumptions may survive in background jobs, cache keys,
  exports, or support views despite protected request routes.
- Migrating records without unique owner/consent and replay mapping can expose
  another user's data or make historical decisions irreproducible.
- Disposition: `DOC-CONFLICT-004` remains in the
  [conflict ledger](../evidence/legacy-document-conflicts.md); current
  authentication descriptions do not prove shared-service isolation.

## Success Evidence

- Negative cross-tenant fixtures cover storage, cache, jobs, logs, support,
  exports, model artifacts, and URLs/API access, including deletion/retention
  boundaries and legal holds. None can read or mutate another account.
- Migration fixtures reconcile record counts, owner and consent mapping,
  source provenance, immutable snapshot/replay IDs, and collision rejection
  before/after cutover and rollback.
- Paid activation remains disabled until versioned OQ-1/2/6/8 artifacts and
  entitlement, billing, support, cost, gross-margin, security, and recovery
  suites pass with recorded command, result, environment, date, and locator.

## Story Plan

IDs are proposals only. Separate EPIC-010 planning waits for tenant model,
threat model, migration matrix, and legal/rights/economics approvals.

| Proposed story | Outcome | Dependency |
|---|---|---|
| `STORY-010-01` | Enforce authenticated tenant ownership across all stores and operations. | EPIC-002 and tenant threat model |
| `STORY-010-02` | Migrate isolated records without ownership or replay loss. | STORY-010-01 and EPIC-008 lifecycle |
| `STORY-010-03` | Gate subscriptions and paid activation on approved economics. | STORY-010-01 and OQ-6 |
| `STORY-010-04` | Prove legal, rights, isolation, privacy, and recovery release gates. | STORY-010-02, STORY-010-03, and OQ-1/2/8 |
