# EPIC-009 - Read-Only Broker Synchronization

- Phase: Post-V1; explicitly Deferred from Value MVP.
- Delivery state: `CAP-TGT-009` and both owned requirements remain Deferred.

## Outcome

An investor may compare staged read-only broker records with the trusted
transaction ledger and resolve conflicts explicitly. `CAP-TGT-009` improves
reconciliation without silently replacing ledger-derived holdings or adding
any ability to create, route, execute, or write back a trade.

## Problem

Manual and CSV portfolio records can differ from broker records. Treating a
broker response as authoritative or auto-overwriting the ledger would hide
duplicates, corporate-action differences, and cost-basis conflicts.

## Scope

- Obtain only read-authorized broker records under a separately approved
  broker-rights and credential model; stage raw records with source, time,
  account mapping, and import version.
- Validate and normalize transactions, positions, identifiers, currency,
  duplicates, and corrections before proposing reconciliation.
- Compare staged records with immutable ledger events and Portfolio State;
  present unresolved conflicts, require explicit resolution, and apply only
  reviewed ledger changes through the existing ledger contract.
- Audit imports, decisions, and conflict resolution; verify the connector has
  no order-write scope, endpoint, credential permission, or write-back route.

## Out of Scope

Value-MVP delivery, trading, order creation/routing/execution, broker
write-back, silent ledger overwrite, automatic rebalancing, or broker data as
an unreviewed replacement for Portfolio State.

## Requirements

Each row is the sole primary assignment from the
[gap map](../CAPABILITY_GAP_MAP.md); both PRD rows are `Deferred`.

| Requirement | Delivery boundary |
|---|---|
| `PRD-FR-050` | Staged read-only reconciliation without overwrite. |
| `PRD-FR-051` | No trade-order creation or execution capability. |

## Dependencies

- [EPIC-002](EPIC-002-transaction-ledger-portfolio-state.md) remains the
  ledger and Portfolio State authority; [EPIC-001](EPIC-001-trusted-market-evidence.md)
  supplies instrument identity and rights discipline.
- Post-V1 roadmap approval, broker agreements/read scope, credential security,
  account mapping, conflict policy, and OQ-5 contract review precede detailed
  connector stories. OQ-8 governs external security and recovery gates.

## Risks

- Partial broker history, splits, transfers, reversals, and differing
  cost-basis conventions can produce false matches or unsafe overwrite.
- An OAuth scope or endpoint with latent order-write permission violates the
  read-only boundary even if the UI omits a trade button.

## Success Evidence

- Import/reconciliation fixtures stage, validate, deduplicate, and flag
  conflicting rows; no ledger or holding changes until explicit resolution.
- Replayed ledger and Portfolio State remain authoritative after broker
  errors, disconnect, reordered data, and restart.
- Permission, endpoint, credential, and negative security tests prove no
  order-write or broker write-back capability. Test records include command,
  result, environment, date, and locator before any Post-V1 pilot.

## Story Plan

IDs are proposals only. Detailed stories wait for broker rights, mapping,
conflict policy, security review, and a separate EPIC-009 plan.

| Proposed story | Outcome | Dependency |
|---|---|---|
| `STORY-009-01` | Stage and validate read-authorized broker records. | EPIC-002 and broker-rights approval |
| `STORY-009-02` | Reconcile duplicates/conflicts into reviewed ledger proposals. | STORY-009-01 and conflict policy |
| `STORY-009-03` | Prove no order-write, execution, or write-back permission. | STORY-009-01 and OQ-8 security review |
