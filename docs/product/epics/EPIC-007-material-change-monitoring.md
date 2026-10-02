# EPIC-007 - Material Change Monitoring

- Phase: Value MVP, after retained decisions and shortlist.
- Delivery state: Target catalog only; alert classes are approval-bounded.

## Outcome

An investor gets a daily, low-noise summary of material evidence changes for
holdings, retained decisions, and shortlisted assets. `CAP-TGT-007` can flag
only approved high-priority event classes, preserves auditable event history,
and can be disabled without interrupting research.

## Problem

Polling changes without event identity, materiality, priority policy, and
deduplication could create repeated or unsupported alerts. A failed alert
system must not damage retained research or prevent access to decisions.

## Scope

- Compare prior and new versioned evidence for retained decisions, ledger
  holdings, and shortlist entries; publish a daily summary within 24 hours of
  successful ingestion, with both evidence versions and observed change.
- Restrict high priority to earnings or regulatory filings, deterministic
  portfolio-limit breaches, provider-confirmed corporate events, and critical
  evidence-staleness. Additional classes require an approved PRD change.
- Deduplicate materially equivalent asset/event/evidence-version alerts while
  preserving the underlying event history and explaining each suppression.
- Measure zero unsupported high-severity events, fewer than 2% duplicates,
  and at least 70% useful ratings under an OQ-7 measurement dictionary.
- Support independent generation and delivery disable switches, alongside
  separate provider/AI/personalization switches, without deleting history or
  disabling deterministic research.

## Out of Scope

Ordinary-news high-severity alerts, unverified corporate events, stale-event
promotion, autonomous trading, or new priority classes without PRD approval.

## Requirements

Each row is the sole primary assignment from the
[gap map](../CAPABILITY_GAP_MAP.md).

| Requirement | Delivery boundary |
|---|---|
| `PRD-FR-040` | Daily material-change summaries with prior/new evidence. |
| `PRD-FR-041` | Closed high-priority event-class policy. |
| `PRD-FR-042` | Deduplication with retained auditable history. |
| `PRD-FR-043` | Independent generation/delivery disable fallback. |
| `PRD-NFR-010` | Independent AI, personalization, alert, and provider switches. |
| `PRD-NFR-012` | Eligible change availability within 24 hours. |

## Dependencies

- [EPIC-001](EPIC-001-trusted-market-evidence.md) supplies event provenance
  and source status; [EPIC-002](EPIC-002-transaction-ledger-portfolio-state.md)
  supplies holdings; [EPIC-004](EPIC-004-investment-quality-and-portfolio-fit.md)
  supplies retained decisions; [EPIC-005](EPIC-005-explainable-discovery.md)
  supplies shortlist membership.
- OQ-7 approves the event, timeliness, deduplication, and usefulness metric
  dictionary. OQ-8 governs release/rollback and incident ownership. Rights
  approval must cover any external event evidence.

## Risks

- Delayed or contradicted provider events can look urgent unless confirmation,
  observation time, and freshness are checked at classification time.
- A switch that only stops delivery but continues generating high-severity
  events fails the independent-disable requirement and may leak on restart.

## Success Evidence

- Stubbed event fixtures exercise every approved priority class and reject
  ordinary news, unverified events, stale events, and unsupported classes.
- Replayable ingestion-to-availability tests record timestamps for the
  24-hour gate; duplicate-rate fixtures count equivalent alerts per
  asset/event/evidence version and verify retained suppressed-event history.
- OQ-7 survey/sample artifacts substantiate the useful-rating gate.
  Generation/delivery/provider/AI switch drills preserve research and history,
  with command, result, environment, date, and locator recorded for OQ-8.

## Story Plan

IDs are proposals only. Detailed criteria wait for event and measurement
policies, rights, release gates, and a separate EPIC-007 plan.

| Proposed story | Outcome | Dependency |
|---|---|---|
| `STORY-007-01` | Detect versioned material changes for retained user assets. | EPIC-001, EPIC-002, EPIC-004, and EPIC-005 |
| `STORY-007-02` | Classify and deduplicate approved high-priority events. | STORY-007-01 and OQ-7 |
| `STORY-007-03` | Deliver timely summaries with independent disable and history retention. | STORY-007-02 and OQ-8 |
