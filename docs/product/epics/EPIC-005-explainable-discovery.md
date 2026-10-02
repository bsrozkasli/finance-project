# EPIC-005 - Explainable Discovery

- Phase: Value MVP, after the trusted-core evidence and research contracts.
- Delivery state: Target catalog only; not an implemented screen.

## Outcome

An investor can screen a point-in-time supported U.S. stock and eligible
equity-ETF universe, understand why each returned candidate matched, and save
a shortlist for deeper research. `CAP-TGT-005` produces the same candidates
from the same universe, evidence, and rule versions without running AI.

## Problem

Searching or opening an asset is not the target deterministic discovery flow.
An unversioned or survivor-only universe could produce attractive but
irreproducible candidates, while batch AI runs would add cost without user
intent and obscure missing evidence.

## Scope

- Screen only instruments classified at the evaluation time by the licensed
  NYSE/Nasdaq common-stock and eligible U.S. equity-ETF security master.
- Apply versioned deterministic filters before candidate AI; retain universe,
  rule, snapshot, rights, and exclusion/missingness context for replay.
- Explain rule and evidence reasons for every returned candidate; rejection
  notes for the entire excluded universe remain optional.
- Save, remove, and optionally annotate shortlist entries with originating
  screen version; launch full research from a selected entry.
- Allow costly AI research only after an explicit user-selected candidate and
  request, subject to approved per-user/cohort cost and data-rights boundaries.

## Out of Scope

AI-authored ranking as screen authority, fabricated coverage for unsupported
symbols, broker order execution, and mandatory explanations for every
excluded universe member. Screening does not itself grant rights to display
or redistribute provider data.

## Requirements

Each row is the sole primary assignment from the
[gap map](../CAPABILITY_GAP_MAP.md).

| Requirement | Delivery boundary |
|---|---|
| `PRD-FR-032` | Versioned deterministic pre-AI screen. |
| `PRD-FR-033` | Match and evidence reasons for returned results. |
| `PRD-FR-034` | Persistent, annotated shortlist and research launch. |
| `PRD-FR-035` | User-selected-only cost-intensive AI runs. |

## Dependencies

- [EPIC-001](EPIC-001-trusted-market-evidence.md) supplies point-in-time
  identity, rights, and missingness; [EPIC-003](EPIC-003-end-to-end-asset-research.md)
  supplies deeper asset research. The shortlist does not recalculate either.
- OQ-2 approves security-master and screening-data uses. OQ-7 defines
  Activated Discovery measurement. OQ-6 approves AI/data budget before
  cohort expansion; OQ-8 governs external release stages.

## Risks

- Current constituents alone create survivorship bias in backtests and
  retained screens; delistings and changes must remain time-indexed.
- A screen can appear successful while mandatory rights or evidence are
  unavailable. Such candidates must expose status or be excluded by the
  approved rule, never silently zero-filled.

## Success Evidence

- Independent point-in-time fixtures replay the same candidate set and match
  reasons from frozen universe/rule/snapshot versions, including delisted,
  reclassified, stale, rights-denied, and missing-data cases.
- UI/API persistence tests show returned reasons and evidence status, shortlist
  add/remove/annotation across restart, and the origin screen version.
- Stubbed AI invocation logs map every costly research run to one explicit
  request and selected candidate; batch screening triggers none. OQ-6/7
  artifacts record budget and measurement method with command, result,
  environment, date, and evidence locator before promotion.

## Story Plan

IDs are proposals, not feature story files. Detailed criteria wait for rights,
screen policy, cost/measurement gates, and a separate EPIC-005 plan.

| Proposed story | Outcome | Dependency |
|---|---|---|
| `STORY-005-01` | Replay a licensed point-in-time eligible universe and deterministic screen. | EPIC-001 and OQ-2 |
| `STORY-005-02` | Explain each returned match and persist a versioned shortlist. | STORY-005-01 and EPIC-003 |
| `STORY-005-03` | Gate costly research to explicit shortlist selection. | STORY-005-02 and OQ-6 |
