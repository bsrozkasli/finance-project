# Product Definition and Delivery

This index is a reading map, not a source of requirements or evidence. The
approved foundation describes the target; the baseline and annexes describe
verified current behavior and limits. `SPEC.md` remains the implemented-system
contract. The epics are delivery outcomes, not claims that their features are
implemented.

## Reading Order

| Order | Artifact | Role and status |
|---:|---|---|
| 1 | [Investment Platform Product Foundation Design](../superpowers/specs/2026-09-29-investment-platform-product-foundation-design.md) | Approved product design and phase boundaries; not a runtime contract. |
| 2 | [Current-State Baseline](CURRENT_STATE_BASELINE.md) | Evidence-backed account of the existing system, including limitations. |
| 3 | Evidence annexes below | Detailed bounded observations and unresolved legacy claims supporting the baseline. |
| 4 | [Product Requirements Document](PRD.md) | Canonical target requirements, approval/deferment states, success measures, and open gates. |
| 5 | [Capability Gap Map](CAPABILITY_GAP_MAP.md) | One primary owner and acceptance-evidence path per target requirement. |
| 6 | Epic catalog below | Delivery outcomes and proposed story plans, not completed implementation. |
| 7 | EPIC-000 stories below | Current-state verification package. Feature-epic story files are intentionally absent. |

## Current-State Evidence Annexes

| Annex | What it records |
|---|---|
| [Backend](evidence/backend.md) | Spring contracts, persistence, provider boundaries, and limitations. |
| [Data service](evidence/data-service.md) | FastAPI providers, analytics, and observed failure paths. |
| [Frontend](evidence/frontend.md) | React routes, client contracts, and UI verification limits. |
| [Cross-runtime](evidence/cross-runtime.md) | Handoffs, DTOs, and mismatched or unverified flows. |
| [Legacy document conflicts](evidence/legacy-document-conflicts.md) | Competing claims and explicit dispositions; not silent resolutions. |

## Epic Catalog

All feature epics are target delivery plans. Their `Success Evidence` sections
describe future acceptance proof; they do not certify a release. The gap map
owns primary requirement assignment.

| Epic | Delivery phase | Outcome and status |
|---|---|---|
| [EPIC-000 — Current-State Verification](epics/EPIC-000-current-state-verification.md) | Phase 0 | Current-state audit and verification stories; existing evidence retains its stated limits. |
| [EPIC-001 — Trusted Market Evidence](epics/EPIC-001-trusted-market-evidence.md) | V1 Foundation | Source-, time-, quality-, and rights-traceable evidence; target catalog. |
| [EPIC-002 — Transaction Ledger and Portfolio State](epics/EPIC-002-transaction-ledger-portfolio-state.md) | V1 Foundation | Ledger-derived portfolio state; target catalog. |
| [EPIC-003 — End-to-End Asset Research](epics/EPIC-003-end-to-end-asset-research.md) | V1 Foundation | Connected, asset-specific stock/ETF research; target catalog. |
| [EPIC-004 — Investment Quality and Portfolio Fit](epics/EPIC-004-investment-quality-and-portfolio-fit.md) | V1 Foundation | Deterministic standalone quality, marginal Fit, and Decision Result; target catalog. |
| [EPIC-005 — Explainable Discovery](epics/EPIC-005-explainable-discovery.md) | Value MVP | Deterministic screen and shortlist; target catalog. |
| [EPIC-006 — AI Decision Explanation](epics/EPIC-006-ai-decision-explanation.md) | Value MVP | Optional grounded narrative without decision authority; target catalog. |
| [EPIC-007 — Material Change Monitoring](epics/EPIC-007-material-change-monitoring.md) | Value MVP | Low-noise summaries and bounded alerts; target catalog. |
| [EPIC-008 — Personal Investment Policy](epics/EPIC-008-personal-investment-policy.md) | Post-V1 | Approved target capability, but delivery remains Deferred. |
| [EPIC-009 — Read-Only Broker Synchronization](epics/EPIC-009-read-only-broker-synchronization.md) | Post-V1 | Deferred from Value MVP; no execution or write-back. |
| [EPIC-010 — SaaS Identity and Isolation](epics/EPIC-010-saas-identity-and-isolation.md) | Post-V1 | Deferred from Value MVP; no paid or shared release claim. |

## EPIC-000 Verification Stories

These are the six existing current-state audit stories. Their acceptance
criteria are separate from future feature delivery.

| Story | Verification outcome |
|---|---|
| [STORY-000-01 — Audit Backend Capabilities](stories/EPIC-000/STORY-000-01-audit-backend-capabilities.md) | Backend evidence and limits. |
| [STORY-000-02 — Audit Data-Service Capabilities](stories/EPIC-000/STORY-000-02-audit-data-service-capabilities.md) | Data-service evidence and limits. |
| [STORY-000-03 — Audit Frontend Capabilities](stories/EPIC-000/STORY-000-03-audit-frontend-capabilities.md) | Frontend evidence and limits. |
| [STORY-000-04 — Verify Cross-Runtime Contracts](stories/EPIC-000/STORY-000-04-verify-cross-runtime-contracts.md) | Cross-runtime contract evidence and conflicts. |
| [STORY-000-05 — Reconcile Legacy Document Claims](stories/EPIC-000/STORY-000-05-reconcile-legacy-document-claims.md) | Legacy-claim dispositions. |
| [STORY-000-06 — Publish Current-State Baseline](stories/EPIC-000/STORY-000-06-publish-current-state-baseline.md) | Traceable baseline publication. |

## Governance and Review Inputs

[Product Documentation Authoring Contract](CONTRIBUTING.md) defines artifact
roles, evidence levels, IDs, and validation. The following records are review
inputs, not separate requirement or capability-evidence sources:

| Record | Purpose |
|---|---|
| [Foundation reconciliation](reconcile-foundation.md) | Design-to-PRD dispositions. |
| [Finance and risk reconciliation](reconcile-finance-risk.md) | Finance/risk finding dispositions. |
| [Brownfield review](review-brownfield.md) | Existing-system and scope review. |
| [Finance review](review-finance.md) | Financial policy review input. |
| [Rubric review](review-rubric.md) | Readiness, security, and measurement review. |

## Planning Boundary

Detailed `EPIC-001` through `EPIC-010` story files require separate,
epic-specific plans and the approvals named in each epic. Passing documentation
validation permits that planning handoff only; it is not approval for external
policy-conditioned output, use of unlicensed data, product release, or paid
SaaS operation.
