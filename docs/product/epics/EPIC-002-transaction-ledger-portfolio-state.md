# EPIC-002 - Transaction Ledger and Portfolio State

- Phase: V1 Foundation, after the trusted-evidence contract.
- Delivery state: Target catalog only; readiness follows the gap map.

## Outcome

An investor can enter or import transactions and recover the same holdings,
cost basis, realized activity, and exposures from a traceable immutable ledger.
Every later Portfolio Fit and Decision Result can resolve the exact
`CAP-TGT-002` Portfolio State version it used.

## Problem

Current Spring ledger and portfolio routes exist, but the target requires
staged CSV reconciliation, idempotency, complete source lineage, replayable
state identifiers, and tested external-evaluation recovery. Current route
presence and skipped persistence tests do not prove those guarantees.

## Scope

- Support one initial user portfolio with manual transaction entry and
  provenance to each accepted ledger event.
- Stage CSV rows; validate schema and normalization, identify duplicates and
  conflicts, then require visible reconciliation before ledger acceptance.
- Derive holdings, cost basis, realized activity, and exposures from retained
  transactions; make re-import idempotent and bind a versioned Portfolio State
  to downstream decisions.
- Test encrypted backup and restore of portfolio and retained decision data
  before external evaluation, subject to OQ-8 recovery approval.

## Out of Scope

Broker synchronization, order creation, automatic rebalancing, multi-portfolio
semantics, and cash accounting beyond a separately approved scope decision.
The data-service does not become a portfolio persistence owner.

## Requirements

Each row is the sole primary assignment from the
[gap map](../CAPABILITY_GAP_MAP.md).

| Requirement | Delivery boundary |
|---|---|
| `PRD-FR-011` | Manual transaction entry with durable lineage. |
| `PRD-FR-012` | Staged, validated, reconciled CSV import. |
| `PRD-FR-013` | Idempotent re-import and deduplication. |
| `PRD-FR-014` | Immutable ledger-derived Portfolio State. |
| `PRD-FR-015` | Exact Portfolio State version in Fit and decisions. |
| `PRD-NFR-021` | Tested encrypted backup and restore before external use. |

## Dependencies

- [EPIC-001](EPIC-001-trusted-market-evidence.md) supplies stable asset
  identity and evidence/freshness contracts; [EPIC-000](EPIC-000-current-state-verification.md)
  records the current Spring ledger and the skipped integration coverage.
- CSV schema and source-lineage contract must be approved before import
  acceptance. OQ-5 applies to changed public DTOs; OQ-8 approves recovery
  targets and external-evaluation gates.
- EPIC-003 and EPIC-004 consume the exact ledger-derived state, not an
  independently calculated browser or data-service portfolio value.

## Risks

- Duplicate rows, reordered imports, corrections, and provider price gaps can
  corrupt displayed holdings or downstream Fit unless inputs remain staged and
  versioned.
- The proposed four-hour RPO and 24-hour RTO in `PRD-NFR-021` are not approved
  release thresholds until OQ-8 closes.
- Disposition: Retain `DOC-CONFLICT-005` as historical persistence context in
  the [conflict ledger](../evidence/legacy-document-conflicts.md); a MongoDB
  configuration does not establish current or target ledger ownership.

## Success Evidence

- Backend persistence/restart fixtures trace every accepted manual or CSV
  event to source and show invalid/conflicting rows remain staged.
- Re-import and concurrency fixtures produce no duplicate ledger entry,
  holding, or realized activity; replay reproduces the same holdings and
  Portfolio State ID after restart.
- Cross-runtime contract fixtures bind downstream Portfolio Fit and Decision
  Result to that exact state version. Encrypted backup/restore exercises record
  command, result, date, environment, and locator before external evaluation.

## Story Plan

These proposed IDs are not feature story files. Detailed acceptance waits for
CSV/schema, state-version, OQ-5, and OQ-8 decisions in a separate EPIC-002 plan.

| Proposed story | Outcome | Dependency |
|---|---|---|
| `STORY-002-01` | Enter durable manual transactions with source lineage. | EPIC-001 asset identity |
| `STORY-002-02` | Stage and reconcile idempotent CSV imports. | STORY-002-01 and CSV schema |
| `STORY-002-03` | Replay versioned Portfolio State and prove restore. | STORY-002-02 and OQ-8 |
